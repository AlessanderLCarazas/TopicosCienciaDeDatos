import pandas as pd

# Paso 1: Cargar los datos desde un archivo CSV
df = pd.read_csv('owid-covid-data-limpio.csv')

# Paso 2: Convertir la columna 'date' a tipo datetime para facilitar el manejo de fechas
df['date'] = pd.to_datetime(df['date'])

# Paso 3: Rellenar valores faltantes

numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
df[numeric_cols] = df[numeric_cols].fillna(0)

# Paso 4: Verificar y eliminar duplicados
df = df.drop_duplicates()


# Paso 5 Agregar columnas adicionales
df['total_cases_per_million'] = (df['total_cases'] / df['population']) * 1e6
df['total_deaths_per_million'] = (df['total_deaths'] / df['population']) * 1e6

df.to_csv('owid-covid-data-procesado.csv', index=False)

print(df.head())
print(df.info())

