import { createContext, ReactNode, useContext, useState } from "react";
import { OfferObject } from "./helpers";
export interface CallStatusType {
  haveMedia?: boolean;
  audioEnabled?: boolean | null;
  videoEnabled?: boolean | null;
  answer?: RTCSessionDescription;
  myRole?: string;
  inCall?: boolean;
}
interface RtcContextType {
  callStatus: CallStatusType;
  updateCallStatus: (cs: CallStatusType) => void;
  localStream: MediaStream | null;
  setLocalStream: (stream: MediaStream) => void;
  remoteStream: MediaStream | null;
  setRemoteStream: (stream: MediaStream) => void;
  peerConnection: RTCPeerConnection | null;
  setPeerConnection: (pc: RTCPeerConnection) => void;
  offerData: OfferObject | null;
  setOfferData: (offerObj: OfferObject) => void;
}

const RtcContext = createContext<RtcContextType | undefined>(undefined);

export const useRtcContext = () => {
  const context = useContext(RtcContext);
  if (!context) {
    throw new Error("useRtcContext must be used within RtcProvider");
  }
  return context;
};

export const RtcProvider = ({ children }: { children: ReactNode }) => {
  const [callStatus, updateCallStatus] = useState({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [offerData, setOfferData] = useState<OfferObject | null>(null);
  return (
    <RtcContext.Provider
      value={{
        callStatus,
        updateCallStatus,
        localStream,
        setLocalStream,
        remoteStream,
        setRemoteStream,
        peerConnection,
        setPeerConnection,
        offerData,
        setOfferData,
      }}
    >
      {children}
    </RtcContext.Provider>
  );
};
