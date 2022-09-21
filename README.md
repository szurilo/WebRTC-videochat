todo:
Change Firebase Test mode to Locked mode:
https://firebase.google.com/docs/firestore/security/overview

Refactor:

1. Start local camera and create an offer with text below "To make a call type the below id into the other devices/browser windows input field and press the call button".
2. Call button is only enabled if the input box is not empty.
3. Hangup button is only enabled if there is an ongoing call.
4. Local video is visible first. When call is answered local goes to the upper right and remote becomes visible with full size.
