import matplotlib.pyplot as plt

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

fig, ax = plt.subplots()

x, y = zip(*vector_cache)
line, = plt.plot(x, y, 'o')
team_index = load.teams_to_indices['frc' + input('Team Number?\n')]
plt.plot(x[team_index], y[team_index], 'x')

annot = ax.annotate('', xy=(0, 0), xytext=(-20, 20), textcoords='offset points', bbox=dict(boxstyle='round', fc='w'), arrowprops=dict(arrowstyle='->'))
annot.set_visible(False)

def update_annot(ind):
    x,y = line.get_data()
    annot.xy = (x[ind['ind'][0]], y[ind['ind'][0]])
    annot.set_text(' '.join([load.indices_to_teams[n] for n in ind['ind']]))
    annot.get_bbox_patch().set_alpha(0.4)


def hover(event):
    vis = annot.get_visible()
    if event.inaxes == ax:
        cont, ind = line.contains(event)
        if cont:
            update_annot(ind)
            annot.set_visible(True)
            fig.canvas.draw_idle()
        else:
            if vis:
                annot.set_visible(False)
                fig.canvas.draw_idle()


fig.canvas.mpl_connect('motion_notify_event', hover)

plt.show()