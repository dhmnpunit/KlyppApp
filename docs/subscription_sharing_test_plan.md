# Klypp App - Subscription Sharing Test Plan

This document outlines a comprehensive test plan for the subscription sharing functionality in the Klypp app. Use this plan to verify that all sharing features work correctly and securely.

## Test Environment Setup

### Test Users
Create at least three test users:
- **User A**: Primary subscription owner
- **User B**: Invited member
- **User C**: Uninvited user (for security testing)

### Test Subscriptions
Create the following test subscriptions:
- **Personal Subscription**: Owned by User A, not shared
- **Shared Subscription 1**: Owned by User A, shared with User B
- **Shared Subscription 2**: Owned by User B, shared with User A

## Test Scenarios

### 1. Creating and Managing Subscriptions

#### 1.1 Creating a Personal Subscription
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Navigate to "Add Subscription" | Add Subscription form is displayed |
| 3 | Fill in subscription details, set as not shared | Form is completed |
| 4 | Submit the form | Subscription is created and appears in User A's dashboard |
| 5 | Sign in as User B | User B is authenticated |
| 6 | Check dashboard | User A's personal subscription should NOT be visible |

#### 1.2 Creating a Shared Subscription
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Navigate to "Add Subscription" | Add Subscription form is displayed |
| 3 | Fill in subscription details, set as shared | Form is completed |
| 4 | Submit the form | Subscription is created and appears in User A's dashboard |
| 5 | Sign in as User B | User B is authenticated |
| 6 | Check dashboard | User A's shared subscription should NOT be visible yet (until invited and accepted) |

### 2. Invitation Process

#### 2.1 Sending Invitations
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Navigate to shared subscription details | Subscription details are displayed |
| 3 | Click "Invite Member" | Invite form is displayed |
| 4 | Enter User B's username and send invitation | Invitation is sent successfully |
| 5 | Sign in as User B | User B is authenticated |
| 6 | Navigate to Notifications | Invitation from User A is visible |

#### 2.2 Accepting Invitations
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User B | User B is authenticated |
| 2 | Navigate to Notifications | Invitation from User A is visible |
| 3 | Click "Accept" on the invitation | Invitation is accepted |
| 4 | Navigate to Dashboard | User A's shared subscription now appears in User B's dashboard |
| 5 | Open the shared subscription | Subscription details are visible to User B |

#### 2.3 Rejecting Invitations
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Create another shared subscription | New subscription is created |
| 3 | Invite User B | Invitation is sent |
| 4 | Sign in as User B | User B is authenticated |
| 5 | Navigate to Notifications | New invitation is visible |
| 6 | Click "Reject" on the invitation | Invitation is rejected |
| 7 | Navigate to Dashboard | The rejected subscription should NOT appear in User B's dashboard |

### 3. Member Management

#### 3.1 Viewing Members
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Navigate to shared subscription details | Subscription details are displayed |
| 3 | Check members list | User B should be listed as a member |
| 4 | Sign in as User B | User B is authenticated |
| 5 | Navigate to shared subscription details | Subscription details are displayed |
| 6 | Check members list | User A should be listed as the admin |

#### 3.2 Removing Members
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Navigate to shared subscription details | Subscription details are displayed |
| 3 | Find User B in the members list | User B is displayed |
| 4 | Click "Remove" for User B | Confirmation dialog appears |
| 5 | Confirm removal | User B is removed from the subscription |
| 6 | Sign in as User B | User B is authenticated |
| 7 | Navigate to Dashboard | The subscription should no longer appear in User B's dashboard |

#### 3.3 Leaving a Subscription
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Create a new shared subscription and invite User B | Invitation is sent |
| 3 | Sign in as User B | User B is authenticated |
| 4 | Accept the invitation | Subscription appears in User B's dashboard |
| 5 | Navigate to subscription details | Details are displayed |
| 6 | Click "Leave Subscription" | Confirmation dialog appears |
| 7 | Confirm leaving | User B is removed from the subscription |
| 8 | Check dashboard | The subscription should no longer appear in User B's dashboard |
| 9 | Sign in as User A | User A is authenticated |
| 10 | Navigate to subscription details | User B should no longer be listed as a member |

### 4. Security Testing

#### 4.1 Unauthorized Access Attempts
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User C | User C is authenticated |
| 2 | Attempt to access User A's subscription directly (by manipulating URL) | Access should be denied |
| 3 | Attempt to view members of User A's subscription | Access should be denied |
| 4 | Attempt to invite users to User A's subscription | Operation should fail |

#### 4.2 API Security Testing
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Use browser developer tools while signed in as User C | Developer tools open |
| 2 | Capture a subscription API request | Request details visible |
| 3 | Modify the request to target User A's subscription | Modified request ready |
| 4 | Send the modified request | Request should be rejected with 403 Forbidden |

### 5. Edge Cases

#### 5.1 Inviting Non-existent Users
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Navigate to shared subscription details | Subscription details are displayed |
| 3 | Click "Invite Member" | Invite form is displayed |
| 4 | Enter a non-existent username | Form is filled |
| 5 | Submit the invitation | Error message should indicate user not found |

#### 5.2 Re-inviting Rejected Users
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Navigate to shared subscription that User B rejected | Subscription details are displayed |
| 3 | Click "Invite Member" | Invite form is displayed |
| 4 | Enter User B's username | Form is filled |
| 5 | Submit the invitation | Invitation should be sent successfully |
| 6 | Sign in as User B | User B is authenticated |
| 7 | Navigate to Notifications | New invitation should be visible |

#### 5.3 Handling Deleted Subscriptions
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Create a new shared subscription and invite User B | Invitation is sent |
| 3 | Sign in as User B | User B is authenticated |
| 4 | Accept the invitation | Subscription appears in User B's dashboard |
| 5 | Sign in as User A | User A is authenticated |
| 6 | Delete the shared subscription | Subscription is deleted |
| 7 | Sign in as User B | User B is authenticated |
| 8 | Check dashboard | The deleted subscription should no longer appear |

## Performance Testing

### 6.1 Multiple Members
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Sign in as User A | User A is authenticated |
| 2 | Create a shared subscription | Subscription is created |
| 3 | Invite 5+ users | Invitations are sent |
| 4 | Navigate to subscription details | All invited members should be listed without performance issues |

### 6.2 Multiple Shared Subscriptions
| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Create a scenario where User B is a member of 10+ shared subscriptions | Multiple subscriptions shared |
| 2 | Sign in as User B | User B is authenticated |
| 3 | Navigate to Dashboard | Dashboard should load all shared subscriptions without significant delay |

## Test Results Tracking

| Test ID | Test Name | Date | Tester | Result | Notes |
|---------|-----------|------|--------|--------|-------|
| 1.1 | Creating a Personal Subscription | | | | |
| 1.2 | Creating a Shared Subscription | | | | |
| 2.1 | Sending Invitations | | | | |
| 2.2 | Accepting Invitations | | | | |
| 2.3 | Rejecting Invitations | | | | |
| 3.1 | Viewing Members | | | | |
| 3.2 | Removing Members | | | | |
| 3.3 | Leaving a Subscription | | | | |
| 4.1 | Unauthorized Access Attempts | | | | |
| 4.2 | API Security Testing | | | | |
| 5.1 | Inviting Non-existent Users | | | | |
| 5.2 | Re-inviting Rejected Users | | | | |
| 5.3 | Handling Deleted Subscriptions | | | | |
| 6.1 | Multiple Members | | | | |
| 6.2 | Multiple Shared Subscriptions | | | | | 