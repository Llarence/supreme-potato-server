from sklearn.cluster import OPTICS
import numpy as np

try:
    from . import load, models
except:
    import load, models

predictor = models.Predictor()
predictor.load()

if input('Defense (y)?\n') == 'y':
    vectorizer = predictor.defense_vectorizer
else:
    vectorizer = predictor.offense_vectorizer
vector_cache = vectorizer.predict(load.one_hot_cache)

cluster_nums = OPTICS().fit(vector_cache).labels_
cluster_nums_to_occurences = {}
cluster_num_set = set(cluster_nums)
for cluster_num in cluster_num_set:
    cluster_nums_to_occurences[cluster_num] = len(np.where(cluster_nums == cluster_num)[0])

print(cluster_nums_to_occurences)

cluster_num = cluster_nums[load.teams_to_indices['frc' + input('Team Number?\n')]]
cluster_indices = np.where(cluster_nums == cluster_num)[0]
print(cluster_num)
print()

if input('See Teams (y)?\n') == 'y':
    for index in cluster_indices:
        print(load.indices_to_teams[index][3:])
