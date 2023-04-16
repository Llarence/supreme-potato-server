import tbapy
import json
import threading

# Ugly
try:
    from . import constants
except:
    import constants

tba = tbapy.TBA('3gnerr3ePmpTujuPLT79EyIr0xHC3fSzZBhdmg8EOZSM2nY0duhvb6oYbxx4yimU')

def get_event_keys(year):
    raw_events = tba.events(year)

    keys = []
    for raw_event in raw_events:
        keys.append(raw_event['key'])

    return keys


def get_event_teams(key):
    raw_teams = tba.event_teams(key)

    teams = []
    for raw_team in raw_teams:
        teams.append(raw_team['key'])

    return teams


def get_event_matches(key):
    raw_event = tba.event(key)
    if raw_event['week'] == None:
        return []

    raw_matches = tba.event_matches(key)

    matches = []
    for raw_match in raw_matches:
        try:
            # Check foul points
            # Maybe remove elim bool
            blue_foul = raw_match['score_breakdown']['blue']['foulPoints']
            blue_teleop = raw_match['score_breakdown']['blue']['teleopPoints'] - blue_foul
            blue_auto = raw_match['score_breakdown']['blue']['autoPoints']
            blue_endgame = raw_match['score_breakdown']['blue']['endGameParkPoints'] + raw_match['score_breakdown']['blue']['endGameChargeStationPoints']

            red_foul = raw_match['score_breakdown']['red']['foulPoints']
            red_teleop = raw_match['score_breakdown']['red']['teleopPoints'] - red_foul
            red_auto = raw_match['score_breakdown']['red']['autoPoints']
            red_endgame = raw_match['score_breakdown']['red']['endGameParkPoints'] + raw_match['score_breakdown']['red']['endGameChargeStationPoints']

            matches.append(((raw_match['alliances']['blue']['team_keys'], (blue_auto, blue_teleop, blue_endgame, blue_foul)), (raw_match['alliances']['red']['team_keys'], (red_auto, red_teleop, red_endgame, red_foul)), (raw_match['comp_level'] != 'qm', raw_event['week'])))
        except:
            pass

    return matches


def generate_team_conversions(teams):
    teams_to_indices = {}
    for i, team in enumerate(teams):
        teams_to_indices[team] = i
    
    return teams_to_indices


keys = get_event_keys(2023)

teams = set()
matches = []

def load(key):
    teams.update(get_event_teams(key))
    matches.extend(get_event_matches(key))


batches = [keys[i:i + constants.download_batch_size] for i in range(0, len(keys), constants.download_batch_size)]
for i, curr_keys in enumerate(batches):
    print('\u001b[2K\r{:.2f}%'.format(i / len(batches) * 100), end='', flush=True)

    threads = []
    for key_num, key  in enumerate(curr_keys):
        thread = threading.Thread(target=load, args=(key,))
        threads.append(thread)
        thread.start()

    for thread_num, thread in enumerate(threads):
        thread.join()

print('\u001b[2K\r100.00%')

teams = list(teams)
teams_to_indices = generate_team_conversions(teams)

with open(constants.cache_location, 'w+') as file:
    file.write(json.dumps((matches, teams_to_indices)))