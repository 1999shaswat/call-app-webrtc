import { log_error } from "@/helpers";
import { CallStatusType } from "@/RtcContext";

export default function prepForCall(
  callStatus: CallStatusType,
  updateCallStatus: (cs: CallStatusType) => void,
  setLocalStream: (stream: MediaStream) => void,
) {
  return new Promise<void>(async (resolve, reject) => {
    const mediaConstraints = {
      audio: false,
      video: {
        aspectRatio: {
          ideal: 1.333333,
        },
      },
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      const copyCS = { ...callStatus };
      copyCS.haveMedia = true;
      copyCS.videoEnabled = null;
      copyCS.audioEnabled = null;
      updateCallStatus(copyCS);
      setLocalStream(stream);
      resolve();
    } catch (err) {
      log_error(err);
      reject(err);
    }
  });
}
