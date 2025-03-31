import { InCallActionButtons } from "@/components/ActionButtons";
import { useAppContext } from "@/Context";
import { useRtcContext } from "@/RtcContext";
import { useEffect, useRef, useState } from "react";

// typeOfCall use it to handle answer and offer call component
export function InCallUI({
  typeOfCall,
  setShowInCallUI,
  setVideoMessage,
}: {
  typeOfCall: string;
  setShowInCallUI: (inCallUI: boolean) => void;
  setVideoMessage: (message: string) => void;
}) {
  const { remoteStream, localStream, peerConnection, callStatus, updateCallStatus, offerData } = useRtcContext();
  const { socket, otherPartySocketId } = useAppContext();

  const remoteFeedEl = useRef<HTMLVideoElement>(null);
  const localFeedEl = useRef<HTMLVideoElement>(null);

  const [offerCreated, setOfferCreated] = useState(false);
  const [answerCreated, setAnswerCreated] = useState(false);
  const [ShowRemoteFeed, setShowRemoteFeed] = useState(typeOfCall === "answer");

  //set localStream and remoteStream to element
  useEffect(() => {
    if (localStream) {
      if (localFeedEl.current) {
        localFeedEl.current.srcObject = localStream;
        console.log("localstream");
      }
      if (remoteFeedEl.current) {
        remoteFeedEl.current.srcObject = remoteStream;
        console.log("remotetream");
      }
    }
  }, []);

  //if we have tracks, disable the video message
  useEffect(() => {
    if (peerConnection) {
      peerConnection.ontrack = (e) => {
        if (e?.streams?.length) {
          setVideoMessage("");
        } else {
          setVideoMessage("Disconnected...");
        }
      };
    }
  }, [peerConnection]);

  useEffect(() => {
    if (typeOfCall === "offer") {
      const shareVideoAsync = async () => {
        if (socket && socket.connected && peerConnection) {
          const offer = await peerConnection.createOffer();
          peerConnection.setLocalDescription(offer);
          socket.emit("newOffer", { offer, targetId: otherPartySocketId });
          setVideoMessage("Awaiting Answer");
          console.log("created offer, setLocalDesc, emitted offer, updated video message");
          setOfferCreated(true);
        }
      };

      if (!offerCreated && callStatus.videoEnabled) {
        console.log("We have video and no offer... making offer");
        shareVideoAsync();
      }
    }
  }, [callStatus.videoEnabled, offerCreated]); //TODO: do we need socket here?

  useEffect(() => {
    if (typeOfCall === "offer") {
      const addAnswerAsync = async () => {
        if (callStatus.answer) {
          await peerConnection?.setRemoteDescription(callStatus?.answer);
          console.log("answer added");
        }
      };

      addAnswerAsync();
    }
  }, [callStatus.answer]);

  useEffect(() => {
    if (typeOfCall === "answer") {
      const addOfferAndCreateAnswerAsync = async () => {
        if (socket && socket.connected && peerConnection && offerData) {
          //add the offer
          await peerConnection.setRemoteDescription(offerData.offer);
          console.log(peerConnection.signalingState); //have remote-offer
          //now that we have the offer set, make our answer
          console.log("Creating answer...");
          const answer = await peerConnection.createAnswer();
          peerConnection.setLocalDescription(answer);
          const copyOfferData = { ...offerData, answer };
          // socket.emitWithAck, search for other emitWithAck
          const offerIceCandidates = await socket.emitWithAck("newAnswer", copyOfferData);
          offerIceCandidates.forEach((c: RTCIceCandidate) => {
            peerConnection.addIceCandidate(c);
            console.log("==Added ice candidate from offerer==");
          });
          setAnswerCreated(true);
        }
      };

      if (!answerCreated && callStatus.videoEnabled) {
        addOfferAndCreateAnswerAsync();
      }
    }
  }, [callStatus.videoEnabled, answerCreated]);

  useEffect(() => {
    if (!localStream || !peerConnection) {
      return;
    }
    console.log("init audio video");
    const copyCallStatus = { ...callStatus };
    if (copyCallStatus.audioEnabled === null) {
      console.log("Init audio!");
      copyCallStatus.audioEnabled = true;
      updateCallStatus(copyCallStatus);

      //add the tracks
      const tracks = localStream.getAudioTracks();
      tracks.forEach((t) => (t.enabled = true));
      localStream.getAudioTracks().forEach((t) => {
        peerConnection.addTrack(t, localStream);
      });
    }
    if (copyCallStatus.videoEnabled === null) {
      // 3. Video is null, so we need to init
      console.log("Init video!");
      copyCallStatus.videoEnabled = true;
      updateCallStatus(copyCallStatus);

      const tracks = localStream.getVideoTracks();
      tracks.forEach((track) => (track.enabled = true));
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }
  }, []);

  useEffect(() => {
    if (socket && socket.connected) {
      socket.on("callAnswered", () => {
        setShowRemoteFeed(true);
      });
    }

    return () => {
      if (socket) {
        socket.off("callAnswered");
      }
    };
  }, [socket]);

  return (
    <>
      <div className="flex justify-center items-center aspect-video pb-2 border-2 rounded-lg border-gray-200 hover:border-gray-300 inCallUI">
        <video className="inCallUI localFeed w-full h-full bg-black scale-x-[-1] rounded-lg" ref={localFeedEl} autoPlay muted />
        <video
          className="inCallUI remoteFeed w-full h-full bg-black scale-x-[-1] rounded-lg"
          ref={remoteFeedEl}
          autoPlay
          muted
          hidden={!ShowRemoteFeed}
        />
      </div>
      <InCallActionButtons
        callStatus={callStatus}
        updateCallStatus={updateCallStatus}
        localFeedEl={localFeedEl}
        remoteFeedEl={remoteFeedEl}
        localStream={localStream}
        peerConnection={peerConnection}
        setShowInCallUI={setShowInCallUI}
        ShowRemoteFeed={ShowRemoteFeed}
      />
    </>
  );
}
