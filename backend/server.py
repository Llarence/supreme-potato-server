import tensorflow as tf
import numpy as np
from scipy.stats import gaussian_kde

import fastapi

import traceback

from analyzer import models, load, constants

predictor = models.Predictor()
predictor.load()

app = fastapi.FastAPI(docs_url=None, redoc_url=None)

# Could optimize graph generation
@app.get('/match')
def read_match(response: fastapi.Response, blue1: int, blue2: int, blue3: int, red1: int, red2: int, red3: int, elim: bool, week: int, graph: bool = False):
    try:
        match = [[['frc' + str(blue1), 'frc' + str(blue2), 'frc' + str(blue3)], [0, 0, 0, 0]], [['frc' + str(red1), 'frc' + str(red2), 'frc' + str(red3)], [0, 0, 0, 0]], [elim, week]]
        match_tensors = load.match_to_tensors(match)
        tensor = tf.stack((match_tensors[0][0], match_tensors[1][0]))
        output = predictor(tensor)
        output_dist = output.tensor_distribution
        means = output_dist.loc
        sum_means = tf.reduce_sum(means, axis=1)

        sample_sums = []
        for i in range(2):
            sample_sum_dist = tf.reduce_sum(output_dist[i].sample(25456), 1)
            sample_sums.append(sample_sum_dist)

        sides = []
        for i in range(2):
            side = {}
            for j, quantity_tracked in enumerate(constants.quantities_tracked):
                side[quantity_tracked] = float(means[i][j].numpy())
            
            side['total'] = float(sum_means[i].numpy())
            side['win_rate'] = np.mean(sample_sums[i] > sample_sums[not i]) * 100

            sides.append(side)

        if graph:
            density_funs = []
            mins = []
            maxs = []

            means = output.mean()
            stddevs = output.stddev()

            for i in range(2):
                density = gaussian_kde(sample_sums[i])
                density.covariance_factor = lambda : 0.25
                density._compute_covariance()

                density_funs.append(density)
                mins.append(tf.math.reduce_min(sample_sums[i]).numpy())
                maxs.append(tf.math.reduce_max(sample_sums[i]).numpy())

            distribution_data = {}
            for j, quantity_tracked in enumerate(constants.quantities_tracked):
                xs = np.linspace(min(means[0][j] - stddevs[0][j] * 2, means[1][j] - stddevs[1][j] * 2, means[0][j], means[1][j]), max(means[0][j] + stddevs[0][j] * 2, means[1][j] + stddevs[1][j] * 2, means[0][j], means[1][j]), 15)

                data = []
                for x in xs:
                    out = output_dist.prob(x)
                    data.append([x, float(out[0][j].numpy()), float(out[1][j].numpy())])
                
                distribution_data[quantity_tracked + '_distribution'] = data
            
            xs = np.linspace(min(min(mins), sum_means[0], sum_means[1]), max(max(maxs), sum_means[0], sum_means[1]), 15)

            data = []
            for x in xs:
                data.append([x, float(density_funs[0](x)), float(density_funs[1](x))])

            distribution_data['total_distribution'] = data

            return {'blue': sides[0], 'red': sides[1], 'distribution_data': distribution_data}
        else:
            return {'blue': sides[0], 'red': sides[1]}
    except Exception as e:
        traceback.print_exc()
        response.status_code = fastapi.status.HTTP_400_BAD_REQUEST