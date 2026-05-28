(function () {
  console.log("starting oidc workflow automation script");
  const { from } = Array;
  const $ = (s, s2) =>
    from(
      document.querySelectorAll(s) ||
        (s2 && document.querySelectorAll(s2)) ||
        [],
    );
  const waitlist = new Map();

  const isVisible = (el) => {
    if (!el) return false;
    if (el.getAttribute("data-attribute") === "hidden") {
      return false;
    }
    const style = getComputedStyle(el);
    return (
      style &&
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  };
  setInterval(() => {
    for (const [s, resolve] of waitlist) {
      const els = $(s);
      if (els.length > 0 && isVisible(els[0])) {
        resolve();
        waitlist.delete(s);
      }
    }
  }, 300);
  const $set = (s, value) => {
    console.log(`setting ${s} to ${value}`);
    const el = $(s)[0];
    if (!el) {
      throw Error(`no element found for selector ${s}`);
    }
    el.focus();
    if (el.tagName === "INPUT" && ["checkbox", "radio"].includes(el.type)) {
      el.checked = value;
    } else {
      el.value = value;
    }
    // react sucks
    const insides = Object.keys(el).find((k) => k.includes("_reactProps"));
    try {
      el[insides].onChange({ target: el });
    } catch (e) {
      console.error(`failed to trigger react onChange for ${s}`, e);
    }
  };

  const wait = async (s) => {
    const p = new Promise((resolve, reject) => {
      waitlist.set(s, resolve);
      setTimeout(() => {
        if (waitlist.has(s)) {
          reject(Error(`timeout waiting for "${s}"`));
          waitlist.delete(s);
        }
      }, 7007);
    });
    return p;
  };
  const $if = async (s, { yes, no }) => {
    const els = $(s);
    if (els.length > 0 && isVisible(els[0])) {
      return yes && yes(els);
    } else {
      return no && no(s);
    }
  };

  const STORE = "oidc-workflow-1.0.0";
  function getWorkflowCached(repo) {
    let wrkfl = window.localStorage.getItem(`${STORE}-${repo}`);
    if (!wrkfl) {
      wrkfl = prompt(
        `Enter the name of the workflow file to use for repo ${repo} (eg "publish.yml")`,
      );
      window.localStorage.setItem(`${STORE}-${repo}`, wrkfl);
    }
    return wrkfl;
  }
  function saveWorkflowCached(repo, workflow) {
    window.localStorage.setItem(`${STORE}-${repo}`, workflow);
  }

  async function main() {
    await $if("#tabpanel-admin", {
      no: async () => {
        $("#package-tab-admin")[0].click();
        await wait("#tabpanel-admin");
      },
    });

    const disallowRadio =
      "#tabpanel-admin form#package-settings input#package-settings_publishingAccess_tfa-always-required";
    if ($(disallowRadio)[0].checked !== true) {
      alert("2fa bypass is enabled. You can fix that below while you're here.");
    }

    await $if("#tabpanel-admin #oidc-repositoryOwner", {
      no: async () => {
        await $if('#tabpanel-admin button[aria-label*="GitHub Actions"]', {
          no: async () => {
            alert(
              "looks like the workflow is already set up, if you want to redo it, click Edit",
            );
          },
          yes: async () => {
            const enableBt = $(
              '#tabpanel-admin button[aria-label*="GitHub Actions"]',
            )[0];
            if (enableBt) {
              enableBt.click();
            }
          },
        });
      },
    });
    await wait("#tabpanel-admin #oidc-repositoryOwner");

    let repo;

    $if('aside a[aria-labelledby="repository repository-link"]', {
      yes: (els) => {
        repo = els[0].href;
      },
      no: () => {
        repo = prompt("full repo url (eg  https://github.com/owner/repo)");
      },
    });
    const repoMatch = repo.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoMatch) {
      throw Error(`unexpected repo url: ${repo}`);
    }
    const [_, owner, repoName] = repoMatch;

    $set("#tabpanel-admin #oidc-repositoryOwner", owner);
    $set("#tabpanel-admin #oidc-repositoryName", repoName);

    $set("#tabpanel-admin #oidc-workflowName", getWorkflowCached(repo));
    $("#tabpanel-admin #oidc-workflowName")[0].addEventListener(
      "change",
      (evt) => {
        const newWorkflow = evt.target.value;
        saveWorkflowCached(repo, newWorkflow);
      },
    );
    $set("#tabpanel-admin #oidc-githubEnvironmentName", "npm");
    $set("#tabpanel-admin input#oidc-allow-stage-publish", true);

    await wait("body");

    $("#tabpanel-admin #oidc-repositoryOwner")[0].focus();

    $('#tabpanel-admin form#oidc button[aria-label^="S"]')[0].click();
  }
  main().catch(console.error);
})();
