# Mission Operations, Tasks, and Check-Ins

## Overview
AegisNet Mission Operations includes tasks, calendar scheduling, file vaulting, duty status check-ins, asset tracking, shift handoffs, and readiness checklists integrated directly into Mission Rooms.

## Mission Tasks & Scheduling
Mission tasks track specific actions that need to be accomplished within a mission context. Tasks can be assigned to members and given a due date.
- **Scheduled Tasks**: Provide a framework for future notification delivery. Notifications are currently mock implementations ("Reminder label only").

## Duty Status and Check-Ins
Provides an operational status toggle for team members to indicate their availability.
- **Statuses Include**: Available, Driving, In Field, On Duty, Off Duty, Low Battery, Weak Network, In Briefing, On Break, Needs Assistance.
- **Warnings**: "Needs Assistance" triggers a strict warning that AegisNet is currently a local-only prototype and is disconnected from live emergency/dispatch services.

## Mission Operations Dashboard
The Dashboard presents an aggregated view of active check-ins, emergencies, pending tasks, and overdue items to give operators immediate awareness of mission status.

## Asset Tracker
The Asset Tracker provides a prototype inventory view for gear (radios, vehicles, medical kits) assigned to members.
- **Warning**: Clearly labeled as a local-only prototype. It is NOT for official chain of custody, evidence control, or live telemetry/GPS tracking.

## Shift Handoff
Shift Handoffs provide a structured summary when an operator transitions duty. It aggregates active tasks, assigned assets, and recent decisions into a text summary.
- **Warning**: Shift handoff logs remain local on the device and do not sync to a centralized server.

## Readiness Checklist
The Readiness Checklist provides pre-mission validation (e.g., Comms Check, Battery Check).
- **Warning**: Passing a checklist in the app does not override real-world safety procedures or agency guidelines.
