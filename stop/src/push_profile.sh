#!/bin/bash
set -o pipefail

#token="$2"
pr_message="[Falco](https://falco.org) has detected a deviation from normal behavior of the workflow.
Review the changes in this PR and accept it in order to establish a new baseline."
PR_DATE=$(date +"%Y%m%d_%H%M%S")
BRANCH_NAME="sysdig-profile-update-$PR_DATE"

git config --global user.email "oss@falco.com"
git config --global user.name "Falco action"
git fetch --all

git checkout -B 'sysdig-profile-update' "$BRANCH_NAME" || git checkout -B 'sysdig-profile-update' "origin/$(git remote show origin | grep 'HEAD branch' | cut -d' ' -f5)"

git add $GITHUB_WORKSPACE/.sysdig/ 
git commit -m 'update sysdig profile'
git push -f --set-upstream origin "$BRANCH_NAME"
gh pr create --title "Updates to falco profile" --body "$(echo -e "$pr_message\n\nchanges:\n\`\`\`\nUpdates to falco profile\n\`\`\`")"
