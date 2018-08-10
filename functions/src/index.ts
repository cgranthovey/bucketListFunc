import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const spawn = require('child-process-promise').spawn;

const gcs = require('@google-cloud/storage')();
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import { DataSnapshot } from '../node_modules/firebase-functions/lib/providers/database';
admin.initializeApp();

//any

// Start writing Firebase Functions

export const helloWorld = functions.https.onRequest((request, response) => {
    console.log("Hello!  Function Ran!")
    response.send("Hello from your bucketlist!");

    const original = request.query.text;
    return admin.firestore().collection("practice").doc("test").create(
        {"text": original}
    ).then((snapshot)=>{
        // return "practice/test".redirect(303, snapshot..toString)
    })

});

export const makeUppercase = functions.firestore.document("newLine/{doc}").onCreate((snapshot, context)=>{
    const doc = snapshot.data();
    console.log("uppercasing - ", context.params.pushId, doc)

    const uppercase = doc.name.toUpperCase();
    return snapshot.ref.update(
        {'uppercase': uppercase}
    )
    // const uppercase = original.toUpperCase();
    // return snapshot.ref.parent.doc("newLine").update(
    //     {'uppercase': uppercase}
    // )
})

export const makeNameUppercase = functions.firestore.document("users/{uid}").onUpdate((snapshot, context)=>{
    const oldData = snapshot.before.data();
    const newData = snapshot.after.data();
    console.log("Make Name Uppercase!");

    if (oldData.fname == newData.fname && oldData.lname != newData.lname){
        return null;
    }

    let newValues = {};
    if (oldData.fname != newData.fname){
        newValues["fnameUpper"] = newData.fname.toUpperCase();
    }
    if (oldData.lname != newData.lname){
        newValues["lnameUpper"] = newData.lname.toUpperCase();
    }
    if (newValues){
        return snapshot.after.ref.update(
            newValues
        )
    }
    return null;

})


// Firestorage

export const makeThumbnail = functions.storage.object().onFinalize((object)=>{
    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;
    const megageneration = object.metageneration;

    if (!contentType.startsWith('image/')){
        console.log("this is not an image.");
        return null;
    }
    const fileName = path.basename(filePath)
    if (fileName.startsWith('thumb_')){
        console.log("Already a thumbnail")
        return null;
    }

    const bucket = gcs.bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const metadata = {
        contentType: contentType
    }
    return bucket.file(filePath).download({
        destination: tempFilePath,
    }).then(() =>{
        console.log("Image downloaded locally to", tempFilePath);
        return spawn('convert', [tempFilePath, '-thumbnail', '200x200>', tempFilePath]);
    }).then(()=>{
        console.log('Thumbnail created at', tempFilePath);

        const thumbFileName = `thumb_${fileName}`;
        const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
        return bucket.upload(tempFilePath, {
            destination: thumbFilePath,
            metadata: metadata
        });
    }).then(()=> fs.unlinkSync(tempFilePath))

})



