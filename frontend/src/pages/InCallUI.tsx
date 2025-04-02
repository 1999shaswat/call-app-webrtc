import { useAppContext } from "@/Context";
import { useRtcContext } from "@/RtcContext";
import { useCallback, useEffect, useRef, useState } from "react";

// typeOfCall use it to handle answer and offer call component
export function InCallUI({
  typeOfCall,
  setVideoMessage,
  remoteFeedEl,
  localFeedEl,
  ShowRemoteFeed,
}: {
  typeOfCall: string;
  setVideoMessage: (message: string) => void;
  remoteFeedEl: React.RefObject<HTMLVideoElement>;
  localFeedEl: React.RefObject<HTMLVideoElement>;
  ShowRemoteFeed: boolean;
}) {
  const { remoteStream, localStream, peerConnection, callStatus, updateCallStatus, offerData } = useRtcContext();
  const { socket, otherPartySocketId } = useAppContext();

  const [offerCreated, setOfferCreated] = useState(false);
  const [answerCreated, setAnswerCreated] = useState(false);

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

  // initializes audio and video
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

  // --- DRAGGABLE LOCAL FEED --- //
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // These handlers are defined as stable references (not recreated every render)
  const handleDrag = (e: MouseEvent) => {
    const localFeedSize = {
      l: localFeedEl.current?.getBoundingClientRect().width || 0,
      b: localFeedEl.current?.getBoundingClientRect().height || 0,
    };
    const container = remoteFeedEl.current?.getBoundingClientRect();
    if (!container) return;

    const newX = Math.max(0, Math.min(e.clientX - container.left - dragOffset.x, container.width - localFeedSize.l));
    const newY = Math.max(0, Math.min(e.clientY - container.top - dragOffset.y, container.height - localFeedSize.b));

    // For debugging
    // console.log("Dragging at:", newX, newY);

    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = useCallback(() => {
    // console.log("Drag ended at:", positionRef.current);
    setIsDragging(false);

    const container = remoteFeedEl.current?.getBoundingClientRect();
    const localSize = localFeedEl.current?.getBoundingClientRect();
    if (!container || !localSize) return;

    const corners = [
      { x: 0, y: 0 }, // Top-left
      { x: container.width - localSize.width, y: 0 }, // Top-right
      { x: 0, y: container.height - localSize.height }, // Bottom-left
      { x: container.width - localSize.width, y: container.height - localSize.height }, // Bottom-right
    ];

    const distances = corners.map((corner) => ({
      ...corner,
      distance: Math.hypot(positionRef.current.x - corner.x, positionRef.current.y - corner.y),
    }));

    const nearestCorner = distances.reduce((prev, curr) => (curr.distance < prev.distance ? curr : prev));
    // console.log("Snapping to corner:", nearestCorner);

    setPosition({ x: nearestCorner.x, y: nearestCorner.y });
  }, [remoteFeedEl, localFeedEl]);

  // Attach/Detach listeners automatically whenever isDragging changes
  useEffect(() => {
    if (isDragging) {
      // console.log("Attaching event listeners");
      window.addEventListener("mousemove", handleDrag);
      window.addEventListener("mouseup", handleDragEnd);
    } else {
      // console.log("Removing event listeners");
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleDragEnd);
    }

    // Cleanup on unmount
    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, [isDragging]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Start drag");
    setIsDragging(true);

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  return (
    <>
      <div className="flex justify-center items-center rounded-lg InCallUI">
        <div className="relative w-[60vw]">
          <video
            className="inCallUI remoteFeed aspect-video object-cover w-full bg-black scale-x-[-1] rounded-lg"
            ref={remoteFeedEl}
            autoPlay
            hidden={!ShowRemoteFeed || remoteStream == null || remoteStream.getVideoTracks().length === 0}
          />
          {/* <video */}
          {/*   className={` inCallUI localFeed aspect-video object-cover bg-black scale-x-[-1] rounded-lg ${!ShowRemoteFeed || remoteStream == null || remoteStream.getVideoTracks().length === 0 ? "w-full" : "absolute top-0 left-0 h-36"}`} */}
          {/*   ref={localFeedEl} */}
          {/*   autoPlay */}
          {/*   muted */}
          {/* /> */}
          <div
            className={`inCallUI localFeed aspect-video object-cover bg-black scale-x-[-1] rounded-lg 
                 ${!ShowRemoteFeed || remoteStream == null || remoteStream.getVideoTracks().length === 0 ? "w-full" : "absolute h-36 cursor-move top-0 left-0"}`}
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            onMouseDown={startDrag}
          >
            <video ref={localFeedEl} autoPlay muted className="w-full h-full object-cover rounded-lg" />
          </div>
        </div>
      </div>
    </>
  );
}
