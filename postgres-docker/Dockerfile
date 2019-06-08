FROM postgres
ENV POSTGRES_DB wdm
ENV POSTGRES_USER user
ENV POSTGRES_PASSWORD password

COPY setup.sql /docker-entrypoint-initdb.d/
