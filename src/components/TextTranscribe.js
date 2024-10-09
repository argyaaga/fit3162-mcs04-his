import { useState, useEffect } from 'react';
import '../App.css';
import '../styles/transcribe.css'
import axios from "axios";
import { AudioRecorder } from 'react-audio-voice-recorder';
import TranscriptionConfig from '../config/transcription-config.js'


export const TextTranscribe = props => {

    const [text, setText] = useState("")

    useEffect(() => {
        if (props.text) {
            setText(props.text)
        }
    }, [props.text]);

    const sendAudio = (blob) => {
        console.log("uploading...");

        let data = new FormData();

        // data.append('text', "this is the transcription of the audio file");
        data.append('audio', blob);

        const config = {
            headers: {
                'content-type': 'multipart/form-data',
                //'Access-Control-Allow-Origin': '*'
            }
        }
        axios.post(TranscriptionConfig.ENDPOINT, data, config)
            .then(transcription => {
                if (text) {
                    console.log(transcription.data.results);
                    if (text.slice(-1).trim === '' || text.length === 0) {
                        setTextWithProps({name: props.name, value: text.concat("", transcription.data.results)})
                    } else {
                        setTextWithProps({name: props.name, value: text.concat(" ", transcription.data.results)})
                    }
                } else {
                    setTextWithProps({name: props.name, value: transcription.data.results})
                }
            })
            .catch(error => {
                console.log(error.message);
            })

    }

    const setTextWithProps = (text) => {
        setText(text.value);
        if (props.textFunc) {
            props.textFunc(text);
        }
    }
    return (
        <div style={{display: "flex"}}>
        {(props.isInput ? 
            <input disabled={props.disabled ? props.disabled : false} placeholder={props.placeholder ? props.placeholder : ""} name={props.name ? props.name : ""} style={props.style} className='transcribe-text' value={text} onChange={(t) => setTextWithProps(t.target)}/>
            :
            <textarea disabled={props.disabled ? props.disabled : false} placeholder={props.placeholder ? props.placeholder : ""} name={props.name ? props.name : ""} style={props.style} className='transcribe-text' value={text} onChange={(t) => setTextWithProps(t.target)}/>
            )}
            {/* <textarea className='transcribe-text' value={text} onChange={(t) => setTextWithProps(t.target.value)}/> */}
            <AudioRecorder
                onRecordingComplete={sendAudio}
                audioTrackConstraints={{
                noiseSuppression: true,
                echoCancellation: true,
                // autoGainControl,
                // channelCount,
                // deviceId,
                // groupId,
                // sampleRate,
                // sampleSize,
                }}
                onNotAllowedOrFound={(err) => console.table(err)}
                downloadOnSavePress={false}
                downloadFileExtension="webm"
                mediaRecorderOptions={{
                audioBitsPerSecond: 128000,
                }}
                // showVisualizer={true}
            />
        </div>
    );
}