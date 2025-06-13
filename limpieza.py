import pandas as pd

# Lista de columnas a conservar
columnas_conservar = [
    'iso_code', 'continent', 'location', 'date', 'total_cases',
    'new_cases', 'new_cases_smoothed', 'total_deaths', 'new_deaths',
    'new_deaths_smoothed', 'population', 'median_age', 'aged_65_older',
    'aged_70_older', 'gdp_per_capita', 'extreme_poverty',
    'cardiovasc_death_rate', 'diabetes_prevalence', 'total_vaccinations',
    'people_vaccinated', 'people_fully_vaccinated', 'stringency_index'
]

df = pd.read_csv('owid-covid-data.csv')

df_limpio = df[columnas_conservar]

df_limpio.to_csv('owid-covid-data-limpio.csv', index=False)
