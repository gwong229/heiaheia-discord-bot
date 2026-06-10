# How to fix bot

### Get Login token

- Open cmd in folder.

- Run node debug_login.js.

- Login in the new window, should be able to see post feed.

- Press enter in the cmd.

### Encrypt Login token

- Open new cmd.

- Run node encode.js.

- Copy the code, from ewog to ===.

### Update login token

- On github, go to settings of the repo.

- On the left, open the tab Secrets and varibles under the Security and Quality category.

- Click Actions on the dropdown.

- Edit Heia_Session.

- Paste copied encoded token.

- Press Update Secret.

### Check/Run Bot

- On the top nav bar, click Actions.

- On the left nav bar, click HeiaHeia Bot.

- On the right, click run workflow.
