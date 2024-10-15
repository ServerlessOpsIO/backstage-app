# Add any local image custimization here
FROM backstage:latest

# Add SSL cert for RDS. We support all US regions
ADD --chown=node:node https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem ./
ADD --chown=node:node https://truststore.pki.rds.amazonaws.com/us-east-2/us-east-2-bundle.pem ./
ADD --chown=node:node https://truststore.pki.rds.amazonaws.com/us-west-1/us-west-1-bundle.pem ./
ADD --chown=node:node https://truststore.pki.rds.amazonaws.com/us-west-2/us-west-2-bundle.pem ./
RUN cat us-east-1-bundle.pem us-east-2-bundle.pem us-west-1-bundle.pem us-west-2-bundle.pem > ./rds-combined-ca-bundle.pem
RUN chown node:node ./rds-combined-ca-bundle.pem