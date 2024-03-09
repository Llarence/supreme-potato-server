import tensorflow as tf

import fastapi

from analyzer import load, models

import config

class TeamVectors():
    def __init__(self, mean_offense_vectors, mean_defense_vectors, \
                 deviation_offense_vectors, deviation_defense_vectors):
        self.mean_offense_vectors = mean_offense_vectors
        self.mean_defense_vectors = mean_defense_vectors

        self.deviation_offense_vectors = deviation_offense_vectors
        self.deviation_defense_vectors = deviation_defense_vectors


def convert_tensor(team, data):
    id = data.teams_to_ids.get(team, None)
    if id is None:
        return None

    return data.one_hot_teams[id]


def convert_tensors(teams, data):
    tensors = []
    for team in teams:
        tensor = convert_tensor(team, data)
        if tensor is None:
            return None

        tensors.append(tensor)

    return tensors


def score_to_dict(means, stddevs):
    return {
        'total': {
            'mean': means[0],
            'stddev': stddevs[0]
        },
        'auto': {
            'mean': means[1],
            'stddev': stddevs[1]
        },
        'teleop': {
            'mean': means[2],
            'stddev': stddevs[2]
        },
        'foul': {
            'mean': means[3],
            'stddev': stddevs[3]
        },
    }


def get_vectors(year, stddevs, defense, type):
    team_vectors = year_to_team_vectors.get(year, None)
    if team_vectors is None:
        return None

    if type == 'total':
       type_index = 0
    elif type == 'auto':
        type_index = 1
    elif type == 'teleop':
        type_index = 2
    elif type == 'foul':
        type_index = 3
    else:
        return None

    if defense:
        if stddevs:
            return team_vectors.deviation_defense_vectors[type_index]
        else:
            return team_vectors.mean_defense_vectors[type_index]
    else:
        if stddevs:
            return team_vectors.deviation_offense_vectors[type_index]
        else:
            return team_vectors.mean_offense_vectors[type_index]


app = fastapi.FastAPI(docs_url=None, redoc_url=None)

year_to_data_and_model = {}
for year in config.years:
    data = load.Data(year)
    model = models.GameModel(year, data.team_vector_size, data.meta_vector_size, data.output_size)
    model.load_model()

    year_to_data_and_model[year] = (data, model)

year_to_team_vectors = {}
for year in config.years:
    data, model = year_to_data_and_model[year]

    year_to_team_vectors[year] = TeamVectors(
        [vectorizer(data.one_hot_teams) for vectorizer in model.mean_offense_vectorizers],
        [vectorizer(data.one_hot_teams) for vectorizer in model.mean_defense_vectorizers],
        [vectorizer(data.one_hot_teams) for vectorizer in model.deviation_offense_vectorizers],
        [vectorizer(data.one_hot_teams) for vectorizer in model.deviation_defense_vectorizers]
    )


@app.get('/match')
def get_match(response: fastapi.Response,
              year: str,
              elim: bool,
              week: int,
              blues: list[str] = fastapi.Query([]),
              reds: list[str] = fastapi.Query([])):
    if len(blues) == 0 or len(reds) == 0:
        response.status_code = fastapi.status.HTTP_400_BAD_REQUEST
        return

    data, model = year_to_data_and_model.get(year, (None, None))
    if data is None:
        response.status_code = fastapi.status.HTTP_400_BAD_REQUEST
        return

    blue_tensors = convert_tensors(blues, data)
    if blue_tensors is None:
        response.status_code = fastapi.status.HTTP_400_BAD_REQUEST
        return

    blue_tensor = sum(blue_tensors)

    red_tensors = convert_tensors(reds, data)
    if red_tensors is None:
        response.status_code = fastapi.status.HTTP_400_BAD_REQUEST
        return

    red_tensor = sum(red_tensors)

    meta_tensor = tf.constant((elim, week), dtype=tf.float32)

    output = model.model(((tf.stack([blue_tensor, red_tensor], 0),
                           tf.stack([red_tensor, blue_tensor], 0),
                           tf.stack([meta_tensor, meta_tensor], 0))))

    means = output.mean().numpy().tolist()
    stddevs = output.stddev().numpy().tolist()

    return {
        'blue': score_to_dict(means[0], stddevs[0]),
        'red': score_to_dict(means[1], stddevs[1])
    }


@app.get('/team')
def get_team(response: fastapi.Response,
             year: str,
             stddevs: bool,
             defense: bool,
             type: str,
             team: str,
             similars: int = 0):
    vectors = get_vectors(year, stddevs, defense, type)
    if vectors is None:
        response.status_code = fastapi.status.HTTP_400_BAD_REQUEST
        return

    data, _ = year_to_data_and_model[year]
    id = data.teams_to_ids.get(team)
    if id is None:
        response.status_code = fastapi.status.HTTP_400_BAD_REQUEST
        return

    vector = vectors[id]

    if similars == 0:
        return vector.numpy().tolist()

    distances = tf.math.reduce_euclidean_norm(vectors - vector, axis=1)

    teams_distances_vectors = list(zip(data.teams, distances, vectors))
    teams_distances_vectors.sort(key=lambda x: x[1])
    teams_distances_vectors = teams_distances_vectors[:similars]

    return ({'team': team, 'distance': float(distance), 'value': vector.numpy().tolist()} for team, distance, vector in teams_distances_vectors)
