sudo apt-get update
echo y | sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg-agent \
    software-properties-common

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

sudo add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"

sudo apt-get update
echo y | sudo apt-get install docker-ce docker-ce-cli containerd.io
git clone https://github.com/shayorshay/wdm.git
cd wdm
echo y | sudo apt-get install npm
npm install
mkdir /tmp/data
sudo docker swarm init
sudo docker stack deploy -c docker-compose.yml go

sleep 10

node endpoints.js
