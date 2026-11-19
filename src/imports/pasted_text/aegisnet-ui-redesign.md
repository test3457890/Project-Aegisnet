Design a polished multi-theme web app UI for AegisNet, a secure communication platform that combines structured team coordination with private, clean, Signal-inspired communication.

Important design direction:
Use the current AegisNet design as the starting point, but evolve it so it no longer feels too much like Discord.
The app should have two clear interface personalities:

Network Workspace Mode
Used for Networks, rooms, operations, mission rooms, file vaults, team rosters, and structured collaboration.
This mode can keep some of the organized, multi-column behavior similar to Discord, but it must feel more professional, secure, and unique.
Private Comms Mode
Used for direct messages, out-of-network chats, family chats, private group chats, one-on-one calls, and group calls.
This mode should feel much closer to Signal.
It should be cleaner, calmer, softer, more focused, and less server-like.
When a user leaves a Network context and enters a private chat or private call, the UI should noticeably shift into a more personal and simplified communication experience.

Core goal:
AegisNet should not feel like a Discord clone.
It should feel like its own product:
organized like Discord for internal spaces,
private and human like Signal for personal communication,
and mission-ready for secure field operations.

Use the existing screens as inspiration:

home dashboard
network chat layout
security and profile page
encrypted file vault
Improve them with more originality, theme support, and clearer separation between workspace communication and private communication.

Overall style:
Design a calm, premium, secure interface.
Use rounded cards, soft shadows, layered dark surfaces, subtle gradients, and clean typography.
Avoid gamer aesthetics.
Avoid looking too corporate.
Keep the app modern, clear, and reliable.

Add a theme system:
Create multiple visual themes for AegisNet.

Theme 1: Midnight Command
Deep navy backgrounds, slate panels, bright blue actions, green trust indicators, amber weak-signal states, red emergency alerts.

Theme 2: Signal Light
Soft off-white background, cool gray cards, dark text, muted green accents, soft blue actions, minimal and airy like a private messenger.

Theme 3: Field Ops
Muted olive, charcoal, and sand tones.
Feels rugged and operational.
Built for outdoor teams, SAR groups, and mission rooms.

Theme 4: High Contrast Access
Very high readability, clean black and white contrast, large labels, clear states, accessibility-first design.

Theme 5: Night Rescue
Dark blue-black background with cyan, orange, and soft white accents.
Feels tactical but still elegant.

For each theme, keep the same layout system but change colors, tone, and atmosphere.

Design system behavior:
AegisNet should have different shells depending on context.

A. Network Workspace Shell
For when the user is inside a team or organization.
Layout:

left rail for Networks
second column for rooms and categories
center for chats, mission room, or file view
right panel for roster, tasks, alerts, pinned files, and operation status

B. Private Comms Shell
For DMs, private group chats, private calls, and out-of-network communication.
Layout should shift away from the Discord-style server shell.
Use a more Signal-like layout:

left side shows a clean chat list or group list
center shows the conversation
right side can optionally show contact info, shared media, privacy settings, or call participants
remove the heavy “server” feeling
make the message experience more personal, spacious, and focused

Private comms shell should feel softer and simpler:

larger avatars
cleaner chat headers
softer message bubbles
easier media sharing
more visual emphasis on trust, encryption, and connection status
simpler top navigation
less operational clutter

Create a smart context switch:
When the user clicks into a private DM or private group chat, the visual shell should change.
This should look intentional, not like a different app.
Use the same brand, but shift into a cleaner Signal-inspired mode.

Examples:

Network space = structured, layered, operational
Private DM = minimal, intimate, secure
Private group call = modern, clean, people-first
Mission room = focused, command-like, high information density

Add the following improved screens:

Redesigned Home Dashboard
Keep the dashboard, but make it more visually original.
Show:
recent messages
active mission rooms
active private calls
security status
sync status
trusted device alerts
quick actions
theme switcher preview
Redesigned Network Chat Screen
Keep the organizational layout, but make it less like Discord.
Add:
custom category styling
more premium card design
cleaner active states
subtle trust rings on avatars
richer top header
cleaner operation status panel
Private Direct Message Screen
This is a new major screen.
It should feel strongly inspired by Signal.
Show:
conversation with one user
large profile avatar in header
encryption badge
voice call button
video call button
disappearing messages option
shared media preview
voice note bubbles
typing indicator
message reactions
softer rounded bubbles
more generous white space
Private Group Chat Screen
This should feel like Signal group chat, not like a server channel.
Show:
group image or initials
group members preview
trust/verification badge
group call button
shared media
group details drawer
pinned messages
disappearing message timer
reconnect state for users with bad signal
Out-of-Network Call Screen
This is very important.
Design a clean private call experience for one-on-one calls outside of Networks.
It should not look like a voice room.
It should feel like a secure Signal-style calling screen with AegisNet branding.
Show:
full screen call layout
caller avatar or live video
connection quality indicator
encryption indicator
quick text fallback option
reconnecting banner
switch to audio only option
live subtitle option
device handoff option
end-to-end encrypted label
Private Group Call Screen
Design a Signal-inspired group video call.
Make it feel more personal and less like a meeting room.
Show:
clean participant tiles
active speaker emphasis
floating controls
participants drawer
group chat side panel
weak signal banner
reconnecting user tile
“restoring video” state
fallback to audio only
fallback to secure text updates
Mission Room Screen
Keep this more structured and information-rich.
This is where the app can feel more operational.
Include:
mission timeline
task board
roster
call status
map card
file vault card
role assignments
check-in button
emergency alert
reconnect status
field signal health
File Vault Screen
Redesign the vault to feel more premium and original.
Show:
list and card view toggle
file classification style labels
expiration timers
access badges
encrypted status
download restriction state
audit log action
quick filter chips
search
upload action
“shared in chat” origin trace
Security and Profile Screen
Improve the current screen.
Add:
trust ring visuals
safety numbers
QR verify flow
trusted devices
session activity
revoke actions
privacy controls
disappearing message defaults
wipe device action
emergency recovery options
Theme Picker Screen or Modal
Create a beautiful settings modal where users can preview themes.
Show mini previews for:
Midnight Command
Signal Light
Field Ops
High Contrast Access
Night Rescue
Mobile DM Screen
Make the mobile design clearly more Signal-inspired than Discord-inspired.
Show:
clean chat
encryption label
voice note UI
attachment tray
group details
call button
disappearing message settings
Mobile Group Call Screen
Show:
simple clean video call tiles
swipe up participants
reconnecting indicator
switch to audio only
chat overlay
end call
mute
camera
low bandwidth mode

Creative interaction ideas:
Add original touches that make AegisNet feel unique.

A. Smart shell transition
When moving from Network mode into Private Comms mode, animate the interface so the sidebars soften and collapse into a cleaner Signal-like layout.

B. Trust rings
Around avatars, show subtle rings for verification and trust level.

C. Connection state language
Use polished language like:

Secure and connected
Weak signal
Reconnecting
Audio fallback active
Message queueing offline
Restored

D. Call recovery design
When a user disconnects from a private or group call, do not eject them immediately.
Keep their tile visible and show:

Reconnecting
Restoring audio
Restoring video
Switched to low-bandwidth mode
Back online

E. Signal-style composer
For private chats, create a cleaner message composer with:

attachment button
voice note
photo
secure location share
disappearing message timer
emoji
send

F. Shared media drawer
For DMs and group chats, add a side drawer for:

photos
links
files
voice notes
pinned items

G. Quiet mode
Create a low-clutter view for private chats where side panels disappear and the conversation becomes the focus.

H. Focus mode for calls
Allow private calls and group calls to have a distraction-free mode with a dimmed background and floating controls.

Key design rules:

Do not call Networks “servers”
Do not make private chats look like server channels
Make DMs and private groups feel like a secure messenger
Let calls outside of Networks feel personal, not operational
Let Mission Rooms feel operational, not casual
The same brand must connect all modes, but each mode should have its own personality

Component guidance:
Create reusable components for:

sidebars
headers
chat bubbles
voice notes
file cards
map cards
status pills
reconnect banners
call controls
participant tiles
trust badges
theme cards
profile cards
task cards
signal health indicators

Typography and icon direction:
Use modern clean sans-serif typography.
Use rounded iconography with a security-first feel.
Keep icon language consistent across workspace and private modes.

Final design goal:
Design AegisNet as a communication platform with two strong experiences:

a structured secure workspace for Networks and mission operations
a calmer, cleaner, Signal-inspired private communication experience for direct chats, group chats, and private calls

The final result should feel polished, original, multi-theme, secure, and more distinctive than the current Discord-like layout.