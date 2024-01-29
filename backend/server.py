import tensorflow as tf

import fastapi

from analyzer import load, models

import config

app = fastapi.FastAPI(docs_url=None, redoc_url=None)

year_to_data = {}
for year in config.years:
    data = load.Data(year)
    model = models.GameModel(year, data.team_vector_size, data.meta_vector_size, data.output_size)
    model.load_model()

    year_to_data[year] = (data, model)


def convert_tensors(teams, data):
    tensors = []
    for team in teams:
        if not team in data.teams_to_ids:
            return None
            
        tensors.append(data.one_hot_teams[data.teams_to_ids[team]])
    
    return tensors


def score_to_dict(means, stddevs):
    return {
        'total': {
            'mean': float(means[0]),
            'stddev': float(stddevs[0])
        },
        'auto': {
            'mean': float(means[1]),
            'stddev': float(stddevs[1])
        },
        'teleop': {
            'mean': float(means[2]),
            'stddev': float(stddevs[2])
        },
        'foul': {
            'mean': float(means[3]),
            'stddev': float(stddevs[3])
        },
    }


@app.get('/match')
def get_match(response: fastapi.Response,
              year: str,
              elim: bool,
              week: int,
              blues: list[str] = fastapi.Query([]),
              reds: list[str] = fastapi.Query([])):
    if year is None or elim is None or week is None or len(blues) == 0 or len(reds) == 0 is None:
        response.status_code = fastapi.status.HTTP_400_BAD_REQUEST
        return

    if not year in year_to_data:
        response.status_code = fastapi.status.HTTP_400_BAD_REQUEST
        return

    data, model = year_to_data[year]
    
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
    
    means = output.mean().numpy()
    stddevs = output.stddev().numpy()

    return {
        'blue': score_to_dict(means[0], stddevs[0]),
        'red': score_to_dict(means[1], stddevs[1])
    }
