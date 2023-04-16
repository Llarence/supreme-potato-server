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

def get_match_tensors():
    blue_robots = load.one_hot_cache[load.teams_to_indices['frc' + input('Blue Team 1\n')]] + load.one_hot_cache[load.teams_to_indices['frc' + input('Blue Team 2\n')]] + load.one_hot_cache[load.teams_to_indices['frc' + input('Blue Team 3\n')]]
    red_robots = load.one_hot_cache[load.teams_to_indices['frc' + input('Red Team 1\n')]] + load.one_hot_cache[load.teams_to_indices['frc' + input('Red Team 2\n')]] + load.one_hot_cache[load.teams_to_indices['frc' + input('Red Team 3\n')]]

    match_meta = np.zeros(len(load.teams_to_indices), dtype=np.float32)
    match_meta[0] = float(bool(input('Is Elimination\n')))
    match_meta[1] = float(input('Week\n')) - 1
    match_meta = tf.convert_to_tensor(match_meta, dtype=tf.float32)

    return tf.cast(tf.stack((tf.stack((blue_robots, red_robots, match_meta)), tf.stack((red_robots, blue_robots, match_meta)))), dtype=tf.float32)

tensor = get_match_tensors()
output = predictor(tensor)
output_dist = output.tensor_distribution
means = output.mean()
stddevs = output.stddev()

sum_means = tf.reduce_sum(means, axis=1).numpy()

sample_sums = []
density_funs = []
mins = []
maxs = []

for i in range(2):
    sample_sum = tf.reduce_sum(output_dist[i].sample(10000), 1)
    sample_sums.append(sample_sum)

    density = gaussian_kde(sample_sum)
    density.covariance_factor = lambda : 0.25
    density._compute_covariance()

    density_funs.append(density)
    mins.append(tf.math.reduce_min(sample_sum).numpy())
    maxs.append(tf.math.reduce_max(sample_sum).numpy())

print(constants.quantities_tracked)
print('Blue: ' + str(means[0].numpy()) + ' Total: ' + str(sum_means[0]))
print('Red: ' + str(means[1].numpy()) + ' Total: ' + str(sum_means[1]))
print('Blue Win Chance: {:.2f}%'.format(np.mean(sample_sums[0] > sample_sums[1]) * 100))
print('Red Win Chance: {:.2f}%'.format(np.mean(sample_sums[0] < sample_sums[1]) * 100))

while True:
    inp = input('Quantity?\n')

    if inp == 'Done':
        break
    elif inp in constants.quantities_tracked:
        quantity_index = constants.quantities_tracked.index(inp)

        x = np.linspace(min(means[0][quantity_index] - stddevs[0][quantity_index] * 2, means[1][quantity_index] - stddevs[1][quantity_index] * 2, means[0][quantity_index], means[1][quantity_index]), max(means[0][quantity_index] + stddevs[0][quantity_index] * 2, means[1][quantity_index] + stddevs[1][quantity_index] * 2, means[0][quantity_index], means[1][quantity_index]), 250)

        dist_data_blue = []
        dist_data_red = []
        for k in x:
            out = output_dist.prob(k)
            dist_data_blue.append(out[0][quantity_index])
            dist_data_red.append(out[1][quantity_index])
        
        plt.plot(x, dist_data_red, color='red')
        plt.plot(means[1][quantity_index], output_dist.prob(means[1][quantity_index])[1][quantity_index], color='red', marker="x", markersize=10)

        plt.plot(x, dist_data_blue, color='blue')
        plt.plot(means[0][quantity_index], output_dist.prob(means[0][quantity_index])[0][quantity_index], color='blue', marker="x", markersize=10)

        plt.title(inp)
        plt.show()
    elif inp == 'Total':
        x = np.linspace(min(min(mins), sum_means[0], sum_means[1]), max(max(maxs), sum_means[0], sum_means[1]), 250)

        plt.plot(x, density_funs[1](x), color='red')
        plt.plot(sum_means[1], density_funs[1](sum_means[1]), color='red', marker="x", markersize=10)

        plt.plot(x, density_funs[0](x), color='blue')
        plt.plot(sum_means[0], density_funs[0](sum_means[0]), color='blue', marker="x", markersize=10)

        plt.title("Total")
        plt.show()
    else:
        print('Error invalid input.')