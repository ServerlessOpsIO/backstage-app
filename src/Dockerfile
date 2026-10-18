# Add any local image customization here
FROM backstage:latest

USER root
RUN pip install specify-cli
# GitHub CLI, used by Spec Kit workflow github steps. Installed from GitHub's
# apt repository: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl && \
    mkdir -p -m 755 /etc/apt/keyrings && \
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      -o /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
      > /etc/apt/sources.list.d/github-cli.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends gh && \
    rm -rf /var/lib/apt/lists/*
USER node

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
COPY --chown=node:node app-config.d/ app-config.d/
