import fastapi

from analyzer import models, load, constants

predictor = models.Predictor()
predictor.load()

app = fastapi.FastAPI()

@app.get('/match')
async def read_root(response: fastapi.Response, blue1: int, blue2: int, blue3: int, red1: int, red2: int, red3: int, elims: bool, week: int):
    try:
        match = [[['frc' + str(blue1), 'frc' + str(blue2), 'frc' + str(blue3)]], [['frc' + str(red1), 'frc' + str(red2), 'frc' + str(red3)]], [elims, week]]
        tensor = load.match_to_tensors(match)
        output = predictor(tensor)
        output_dist = output.tensor_distribution
        locs = output_dist.loc
        scales = output_dist.scale
        skewness = output_dist.skewness

        blue = {}
        for i, quantity_tracked in enumerate(constants.quantities_tracked):
            blue[quantity_tracked] = (locs[0][i], scales[0][i], skewness[0][i])
        
        red = {}
        for i, quantity_tracked in enumerate(constants.quantities_tracked):
            red[quantity_tracked] = (locs[1][i], scales[1][i], skewness[1][i])

        return {'blue': blue, 'red': red}
    except:
        response.status_code == fastapi.status.HTTP_400_BAD_REQUEST