import tensorflow as tf
import fastapi

from analyzer import models, load, constants

predictor = models.Predictor()
predictor.load()

app = fastapi.FastAPI()

@app.get('/match')
async def read_match(response: fastapi.Response, blue1: int, blue2: int, blue3: int, red1: int, red2: int, red3: int, elim: bool, week: int):
    #try:
    match = [[['frc' + str(blue1), 'frc' + str(blue2), 'frc' + str(blue3)], [0, 0, 0, 0]], [['frc' + str(red1), 'frc' + str(red2), 'frc' + str(red3)], [0, 0, 0, 0]], [elim, week]]
    match_tensors = load.match_to_tensors(match)
    tensor = tf.stack((match_tensors[0][0], match_tensors[1][0]))
    output = predictor(tensor)
    output_dist = output.tensor_distribution
    locs = output_dist.loc
    scales = output_dist.scale
    skewness = output_dist.skewness

    blue = {}
    for i, quantity_tracked in enumerate(constants.quantities_tracked):
        blue[quantity_tracked] = (float(locs[0][i].numpy()), float(scales[0][i].numpy()), float(skewness[0][i].numpy()))
    
    red = {}
    for i, quantity_tracked in enumerate(constants.quantities_tracked):
        red[quantity_tracked] = (float(locs[1][i].numpy()), float(scales[1][i].numpy()), float(skewness[1][i].numpy()))

    return {'blue': blue, 'red': red}
    #except:
        #response.status_code = fastapi.status.HTTP_400_BAD_REQUEST