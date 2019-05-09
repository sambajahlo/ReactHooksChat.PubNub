//These are the two hooks we use the most of through this Chat
import React, { useState, useEffect} from 'react';

//has a few css stylings that we need.
import './App.css';

//This is a hook I created to reduce some of the bloat we get with watching inputs for changes.
import useInputVariable from './useInputVariable.js';

//Lets us import PubNub for our chat infrastructure capabailites.
import PubNub from 'pubnub';

//Material UI Components
import {Card, CardActions, CardContent,List, ListItem,Button,Typography,Input} from '@material-ui/core';

// Our main Component, the parent to all the others, the one to rule them all.
function App(){
  //Set a default channel incase someone navigates to the base url without
  //specificfying a channel name parameter.
  let defaultChannel = "Global";
  //Access the parameters provided in the URL
  let query = window.location.search.substring(1);
  let params = query.split("&");
  for(let i = 0; i < params.length;i++){
    var pair = params[i].split("=");
    //If the user input a channel then the default channel is now set
    //If not, we still navigate to the default channel.
    if(pair[0] === "channel" && pair[1] !== ""){
      defaultChannel = pair[1];
    }
  }

  //Set the states using useState hook,
  //We have our messages, a message adding buffer, our channel,the username, and
  //temp channel and message using the useInputVariable hook. We access what the
  //user is currently typing with those hooks.
  const [messages,setMessages] = useState([]);
  const [incMessage, setIncMessage] = useState([]);
  const [channel,setChannel] = useState(defaultChannel);
  const [username,] = useState(['user', new Date().getTime()].join('-'));

  const tempChannel = useInputVariable("");
  const tempMessage = useInputVariable("");

  useEffect(()=>{
    console.log("setting up pubnub");
    const pubnub = new PubNub({
     //pubnub keys
     publishKey: "pub-c-3d9e1e51-bbaf-4286-847d-199729a3ce5d",
     subscribeKey: "sub-c-d32fe452-6acf-11e9-b514-6a4d3cd75da8",
     uuid: username
   });

    pubnub.addListener({
     status: function(statusEvent) {
       if (statusEvent.category === "PNConnectedCategory") {
         console.log("Connected to PubNub!")
       }
     },
     message: function(msg) {
       if(msg.message.text != null){
         console.log(msg.message.text)
         let newMessage = {
           uuid:msg.message.uuid,
           text: msg.message.text
         };
         setIncMessage(newMessage);
       }
     }
   });
     //Subscribes to the channelName in our state
     pubnub.subscribe({
         channels: [channel]
     });
     pubnub.history(
     {
         channel: channel,
         count: 10, // 100 is the default
         stringifiedTimeToken: true // false is the default
     }, function (status, response){
         for (let i  = 0; i < response.messages.length;i++){
           let newMessage = {
             uuid:response.messages[i].entry.uuid ,
             text: response.messages[i].entry.text
           };
           setIncMessage(newMessage);
         }
       }
     );
    return function cleanup(){
      console.log("shutting down pubnub");
      pubnub.unsubscribeAll();
      setMessages([]);
    }
  },[channel, username]);

  useEffect(()=>{
    setMessages(messages => messages.concat(incMessage));
  },[incMessage])

  useEffect(() => {
    window.addEventListener("popstate",goBack);

    return function cleanup(){
      window.removeEventListener("popstate",goBack);
    }
  },[goBack]);

  function handleNewChannel(event){
    if (event.key === 'Enter') {
      //Navigates to new channels
      if(tempChannel.value){
        if(channel !== tempChannel.value){
          //If the user isnt trying to navigate to the same channel theyre on
          setChannel(tempChannel.value);
          let newURL = window.location.origin + "?channel=" + tempChannel.value;
          window.history.pushState(null, '',newURL);
          tempChannel.setValue('');
        }
      }else{
        //If the user didnt put anything into the channel Input
        if(channel !== "Global"){
          //If the user isnt trying to navigate to the same channel theyre on
          setChannel("Global");
          let newURL = window.location.origin;
          window.history.pushState(null, '',newURL);
          tempChannel.setValue('');
        }
      }
    }
  }

  function handleNewMessage(event){
    if (event.key === 'Enter') {
      publishMessage();
    }
  }

  //Publishing messages via PubNub
   function publishMessage(){
    if (tempMessage.value) {
      let messageObject = {
        text: tempMessage.value,
        uuid: username
      };
      const pubnub = new PubNub({
       //pubnub keys
       publishKey: "pub-c-3d9e1e51-bbaf-4286-847d-199729a3ce5d",
       subscribeKey: "sub-c-d32fe452-6acf-11e9-b514-6a4d3cd75da8",
       uuid: username
      })
      pubnub.publish({
        message: messageObject,
        channel: channel
      })
      tempMessage.setValue('');
    }
  }
  function goBack() {
    console.log("Clicked back")
    //Access the parameters provided in the URL
    let query = window.location.search.substring(1);
    if(!query){
      setChannel("Global")
    }else{
      let params = query.split("&");
      for(let i = 0; i < params.length;i++){
        var pair = params[i].split("=");
        //If the user input a channel then the default channel is now set
        //If not, we still navigate to the default channel.
        if(pair[0] === "channel" && pair[1] !== ""){
            setChannel(pair[1])
        }
      }
    }
  }

  //This returns how our page will look, including a couple
  // components into the heirarchy to help organize our page. We can also pass information down
  //to our children through props.
    return(
      <Card >
          <CardContent>
            <div className="top">
              <Typography variant="h4" inline >
                PubNub React Chat
                </Typography>
              <Input
                style={{width:'100px'}}
                className="channel"
                onKeyDown={handleNewChannel}
                placeholder ={channel}
                onChange = {tempChannel.onChange}
                value={tempChannel.value}
              />
            </div>
            <div >
              <Log messages={messages} channelName={channel}/>
            </div>
          </CardContent>
          <CardActions>
            <Input
              placeholder="Enter a message"
              fullWidth={true}
              value={tempMessage.value}
              onChange={tempMessage.onChange}
              onKeyDown={handleNewMessage}
              inputProps={{'aria-label': 'Message Field',}}
              autoFocus={true}
            />
            <Button
              size="small"
              color="primary"
              onClick={publishMessage}
              >
              Submit
            </Button>
          </CardActions>
        </Card>
      );
}

//Log functional component that is the list of messages
function Log(props) {

  return(
    <List component="nav">
      <ListItem>
      <Typography component="div">
        { props.messages.map((item, index)=>(
          <Message key={index} uuid={item.uuid} text={item.text}/>
        )) }
      </Typography>
      </ListItem>
    </List>
  )
};

//Our message functional component that formats each message.
function Message(props){
  return (
    <div >
      { props.uuid }: { props.text }
    </div>
  );
}

export default App;
