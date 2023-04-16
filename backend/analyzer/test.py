import tensorflow as tf

import matplotlib.pyplot as plt
import numpy as np
from scipy.stats import gaussian_kde

try:
    from . import load, models, constants
except:
    import load, models, constants

predictor = models.Predictor()
predictor.load()

team = 'frc' + input('Team Number?\n')

y = []
x = []
matches_played = []
for match_num, match in enumerate(load.matches):
    print('\u001b[2K\r{:.2f}%'.format(match_num / len(load.matches) * 100), end='', flush=True)
    if match[0][0][0] == team or match[0][0][1] == team or match[0][0][2] == team:
        tensor = load.match_to_tensors(match)
        x.append(tensor[0][0])
        y.append(tensor[0][1])
        matches_played.append(match)

    if match[1][0][0] == team or match[1][0][1] == team or match[1][0][2] == team:
        tensor = load.match_to_tensors(match)
        x.append(tensor[1][0])
        y.append(tensor[1][1])
        matches_played.append(match)

print('\u001b[2K\r100.00%')

x = tf.stack(x)

model_y = predictor(x)

dists = model_y.tensor_distribution
y_means = model_y.mean()
y_stddevs = model_y.stddev()
for i in range(len(matches_played)):
    means = y_means[i]
    stddevs = y_stddevs[i]
    dist = dists[i]
    
    print(matches_played[i], means.numpy(), stddevs.numpy(), model_y.skewness[i])

    for j, name in enumerate(constants.quantities_tracked):
        x = np.linspace(min(means[j] - stddevs[j] * 2, y[i][j]), max(means[j] + stddevs[j] * 2, y[i][j]), 500)

        dist_data = []
        for k in x:
            dist_data.append(dist.prob(k)[j])
        
        plt.plot(x, dist_data)
        plt.plot(y[i][j], dist.prob(y[i][j])[j], marker="x", markersize=10)

        plt.title(name)
        plt.show()
    
    sample_sum_dist = tf.reduce_sum(dist.sample(1000), 1)

    density = gaussian_kde(sample_sum_dist)
    density.covariance_factor = lambda : 1.5
    density._compute_covariance()

    sum_y = sum(y[i])

    x = np.linspace(min(min(sample_sum_dist), sum_y), max(max(sample_sum_dist), sum_y), 1000)
    plt.plot(x, density(x))
    plt.plot(sum_y, density(sum_y), marker="x", markersize=10)

    plt.title("Total")
    plt.show()
