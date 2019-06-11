FROM node:12


WORKDIR /usr/src/app


COPY package*.json ./

RUN npm install pm2 -g
#RUN npm install

# Bundle app source
COPY . .

EXPOSE 8000

#CMD ["npm", "install"]

CMD ["pm2-runtime", "index.js", "-i", "4"]
#CMD [ "pm2", "start", ]
