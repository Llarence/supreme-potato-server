import tensorflow as tf

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

inp_vector = vector_cache[load.teams_to_indices['frc' + input('Team Number?\n')]]

teams_and_dists = []
for team, index in load.teams_to_indices.items():
    teams_and_dists.append((team, tf.math.reduce_euclidean_norm(tf.stack(inp_vector - vector_cache[load.teams_to_indices[team]])).numpy()))

teams_and_dists.sort(key=lambda x: x[1], reverse=True)
for team_and_dist in teams_and_dists:
    print(team_and_dist)