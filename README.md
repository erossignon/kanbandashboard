kanbandashboard
===============

A dashboard to display kanban statistics out of a  redmine projet.



How to install (Linux)
----------------------


    git clone https://github.com/erossignon/kanbandashboard
    cd kanbandashboard
    [sudo] npm install bower grunt-cli -g
    npm install
    bower install 
    grunt 
    grunt compile # to produce translation.js file
    

### create a specific configuration file 

    cp configuration.json.example  configuration.js
      
Edit the configuration file to specify the url of your redmine projet, the name of the projet to monitor and the  
the redmine API key.

    
### fetch redmine ticket data

    node redmineExtract.js --config configuration.js  --fetch
    
### launch the express server
  
    node app.js --config configuration.js
     
#### visit the kanban page 

    http://localhost:3000/kanban/dashboard
    
    
