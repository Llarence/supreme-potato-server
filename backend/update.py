from analyzer import download, train, load, models

import config

for year in config.years:
    download.download(year)

    data = load.Data(year)

    model = models.GameModel(year, data.team_vector_size, data.meta_vector_size, data.output_size)
    train.train(model, data)
    
    model.save_model()
