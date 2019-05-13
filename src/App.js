//These are the two hooks we use the most of through this Chat
import React, { useState, useEffect} from 'react';

//has a few css stylings that we need.
import './App.css';

//This is a hook I created to reduce some of the bloat we get with watching inputs for changes.
import useInput from './useInput.js';

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
      defaultChannel = decodeURI(pair[1]);
    }
  }

  //Set the states using useState hook,
  //We have our messages, a message adding buffer, our channel,the username, and
  //temp channel and message using the useInput hook. We access what the
  //user is currently typing with those hooks.
  const [channel,setChannel] = useState(defaultChannel);
  const [messages,setMessages] = useState([]);
  const [username,] = useState(['user', new Date().getTime()].join('-'));
  const tempChannel = useInput();
  const tempMessage = useInput();
  //This is where we set up PubNub and handle events that come through. Reruns on channel name update!
  useEffect(()=>{
    console.log("setting up pubnub");
    const pubnub = new PubNub({
      publishKey: "<ENTER-PUB-KEY-HERE>",
      subscribeKey: "<ENTER-SUB-KEY-HERE>",
      uuid: username
    });


    pubnub.addListener({
     status: function(statusEvent) {
       if (statusEvent.category === "PNConnectedCategory") {
         console.log("Connected to PubNub!")
       }
     },
     message: function(msg) {
       if(msg.message.text){
         console.log(msg.message.text)
         let newMessages = [];
         newMessages.push({
           uuid:msg.message.uuid,
           text: msg.message.text
         });
         setMessages(messages=>messages.concat(newMessages))
       }
     }
   });
     //Subscribes to the channel in our state
     pubnub.subscribe({
         channels: [channel]
     });
     pubnub.history(
     {
         channel: channel,
         count: 10, // 100 is the default
         stringifiedTimeToken: true // false is the default
     }, function (status, response){
        let newMessages = [];
         for (let i  = 0; i < response.messages.length;i++){
           newMessages.push({
             uuid:response.messages[i].entry.uuid ,
             text: response.messages[i].entry.text
           });
         }
         setMessages(messages=>messages.concat(newMessages));
       }
     );
    return function cleanup(){
      console.log("shutting down pubnub");
      pubnub.unsubscribeAll();
      setMessages([]);
    }
  },[channel, username]);
  //Adding back browser button listener
  useEffect(() => {
    window.addEventListener("popstate",goBack);

    return function cleanup(){
      window.removeEventListener("popstate",goBack);
    }
  },[]);

  function handleKeyDown(event){
    if(event.target.id === "messageInput"){
      if (event.key === 'Enter') {
        publishMessage();
      }
    }else if(event.target.id === "channelInput"){
      if (event.key === 'Enter') {
        //Navigates to new channels
        const newChannel = tempChannel.value.trim();
        if(newChannel){
          if(channel !== newChannel){
            //If the user isnt trying to navigate to the same channel theyre on
            setChannel(newChannel);
            let newURL = window.location.origin + "?channel=" + newChannel;
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

  }

  //Publishing messages via PubNub
  function publishMessage(){
   if (tempMessage.value) {
     let messageObject = {
       text: tempMessage.value,
       uuid: username
     };

     const pubnub = new PubNub({
        publishKey: "<ENTER-PUB-KEY-HERE>",
        subscribeKey: "<ENTER-SUB-KEY-HERE>",
        uuid: username
      });
     pubnub.publish({
       message: messageObject,
       channel: channel
     });
     tempMessage.setValue('');
   }
 }
  function goBack() {
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
            setChannel(decodeURI(pair[1]))
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
                id="channelInput"
                onKeyDown={handleKeyDown}
                placeholder ={channel}
                onChange = {tempChannel.onChange}
                value={tempChannel.value}
              />
            </div>
            <div >
              <Log messages={messages}/>
            </div>
          </CardContent>
          <CardActions>
            <Input
              placeholder="Enter a message"
              fullWidth={true}
              id="messageInput"
              value={tempMessage.value}
              onChange={tempMessage.onChange}
              onKeyDown={handleKeyDown}
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
