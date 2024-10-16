# Add any local image custimization here
FROM backstage:latest

# Add SSL cert for RDS. We support all US regions
ADD --chown=node:node https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem ./
ADD --chown=node:node https://truststore.pki.rds.amazonaws.com/us-east-2/us-east-2-bundle.pem ./
ADD --chown=node:node https://truststore.pki.rds.amazonaws.com/us-west-1/us-west-1-bundle.pem ./
ADD --chown=node:node https://truststore.pki.rds.amazonaws.com/us-west-2/us-west-2-bundle.pem ./
RUN cat us-east-1-bundle.pem us-east-2-bundle.pem us-west-1-bundle.pem us-west-2-bundle.pem > ./rds-combined-ca-bundle.pem
RUN chown node:node ./rds-combined-ca-bundle.pem

# Add app-config.d directory
RUN mkdir app-config.d
RUN chown node:node app-config.d
COPY --chown=node:node app-config.d app-config.d


# Add site-catalog files
RUN mkdir site-catalogs
RUN chown node:node site-catalogs
COPY --chown=node:node site-catalogs/ site-catalogs/

# Add local scaffolders
RUN mkdir site-scaffolders
RUN chown node:node site-scaffolders
COPY --chown=node:node site-scaffolders/ site-scaffolders/
