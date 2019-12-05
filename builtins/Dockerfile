FROM hobsonspipe/centos-node-10-13-0

RUN yum install -y expect && yum clean all

WORKDIR /usr/src/app

# login to private repo in order to be able to pull common libs on @academic-planner scope
ARG repoUser=hpt-npm-user-ro
ARG repoEmail=dl-devops-all@hobsons.com
ARG repoPassword
COPY npmlogin.sh ./
RUN ./npmlogin.sh ${repoUser} ${repoPassword} ${repoEmail} data-channels

COPY package*.json ./

RUN npm install && rm ~/.npmrc

COPY . ./

RUN npm run build

CMD node ./dist/dockerRun.js
