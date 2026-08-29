/* rpgp.app
 *
 * Two jobs: remember a light/dark choice, and drive the certificate list in
 * the hero, which is the app's own window rebuilt in HTML. The page is dark
 * by default; `.light` is the opt-out and it is kept in localStorage.
 *
 * Nothing here is required to read the page. The certificate list and the
 * details pane are in index.html already, with Ada selected; this file only
 * takes over so that clicking and arrowing between rows works.
 */
(function () {
    "use strict";

    /* ------------------------------------------------------------ theme */

    var root = document.documentElement;
    var stored = null;

    try {
        stored = localStorage.getItem("rpgp-theme");
    } catch (e) {
        /* Private mode, or storage disabled. Follow the system and move on. */
    }

    /* Reflect the theme on the control, including before anybody has chosen
       one — there is no media query behind this, so the button describes the
       stylesheet's own default until it is told otherwise. */
    function syncButton(theme) {
        var button = document.getElementById("theme-toggle");
        if (!button) { return; }
        button.setAttribute("aria-pressed", String(theme === "dark"));
        button.setAttribute(
            "aria-label",
            theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"
        );
    }

    function apply(theme) {
        /* Transitions off across the switch, and a forced reflow in the middle
           of it. A declared transition stops the property being recomputed
           when only a custom property underneath it changed, so the header,
           the nav links, the copy buttons and the selected row kept the
           palette they were built with. Reading a layout property with
           transitions suppressed forces the recalculation that settles them,
           and restoring transitions afterwards has nothing left to animate.

           Only `.light` is toggled: dark is what the stylesheet already does,
           so a `dark` class would be a class with no rule behind it. */
        root.classList.add("theming");
        root.classList.toggle("light", theme === "light");
        void root.offsetHeight;
        root.classList.remove("theming");

        syncButton(theme);
    }

    /* Dark unless the visitor has opted into light. */
    function current() {
        return root.classList.contains("light") ? "light" : "dark";
    }

    /* No stored choice means the stylesheet's own default — dark — stands, so
       there is nothing to stamp; the control just has to describe it. */
    if (stored) { apply(stored); } else { syncButton("dark"); }

    var toggle = document.getElementById("theme-toggle");
    if (toggle) {
        toggle.hidden = false;
        toggle.addEventListener("click", function () {
            var next = current() === "dark" ? "light" : "dark";
            stored = next;
            try {
                localStorage.setItem("rpgp-theme", next);
            } catch (e) {
                /* Not being able to remember the choice is not worth an error. */
            }
            apply(next);
        });
    }

    /* ------------------------------------------------------ page chrome */

    /* The header has no bottom rule until the page has moved, the way the
       app's toolbar only separates once there is something above it. */
    var head = document.getElementById("siteHead");
    if (head) {
        var ticking = false;
        var onScroll = function () {
            if (ticking) { return; }
            ticking = true;
            requestAnimationFrame(function () {
                head.classList.toggle("is-stuck", window.scrollY > 8);
                ticking = false;
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    /* Copy affordance, lifted from the app's FieldRow: the glyph swaps to a
       tick tinted --ok and holds for 1600ms. */
    var copyStatus = document.getElementById("copy-status");
    function announce(message) {
        if (copyStatus) { copyStatus.textContent = message; }
    }

    Array.prototype.forEach.call(document.querySelectorAll(".cmd"), function (cmd) {
        var button = cmd.querySelector(".copy");
        if (!button || !navigator.clipboard) {
            if (button) { button.remove(); }
            return;
        }
        var use = button.querySelector("use");
        var timer = null;
        button.addEventListener("click", function () {
            navigator.clipboard.writeText(cmd.dataset.copy).then(function () {
                cmd.classList.add("is-copied");
                use.setAttribute("href", "#i-check");
                announce("Copied " + cmd.dataset.copy + " to the clipboard.");
                clearTimeout(timer);
                timer = setTimeout(function () {
                    cmd.classList.remove("is-copied");
                    use.setAttribute("href", "#i-file");
                }, 1600);
            }, function () {
                /* Clipboard refused. Say so rather than failing silently: the
                   command is on screen and can still be selected by hand. */
                announce("Could not copy. Select the command and copy it manually.");
            });
        });
    });

    /* ------------------------------------------------- the window's data
     *
     * The throwaway certificates from
     * crates/rpgp-core/examples/seed-demo-store.rs, whose comment documents
     * exactly the trust graph reproduced here:
     *
     *     Ada, Grace   own keys, so trust roots      -> verified
     *     Alan         certified in full by Ada      -> verified
     *     Barbara      trusted introducer, from Ada  -> verified
     *     Katherine    certified by Barbara          -> verified, one hop out
     *     Radia        partially certified by Ada    -> partly verified
     *     Linus        nobody has vouched for them   -> unverified
     */

    var CERTS = [
        {
            name: "Ada Lovelace", email: "ada@analytical.engine",
            fp: "4E342E8EFC1F755FF26F929642851AE32ED6D571D110941430396EE231C6789D",
            type: "Ed25519", secret: true, tint: 0,
            auth: "verified"
        },
        {
            name: "Grace Hopper", email: "grace@navy.mil",
            fp: "13B4B9DB2E7036BF708E51D5767EA43057B7144F00C61FA41541E82788BDF143",
            type: "RSA", secret: true, tint: 1,
            auth: "verified"
        },
        {
            name: "Alan Turing", email: "alan@bletchley.uk",
            fp: "118306222A5C670A19933CE2F7B7DD5D38F75D08C02711A21E86C98F64D4F4D9",
            type: "Ed25519", secret: false, tint: 2,
            auth: "verified"
        },
        {
            name: "Barbara Liskov", email: "barbara@substitution.org",
            fp: "E7F9BD949327F82BBA66CF51709BC252CB9454BCDAE8513AC8B3B895E3B99F89",
            type: "Ed25519", secret: false, tint: 3,
            auth: "verified"
        },
        {
            name: "Katherine Johnson", email: "katherine@nasa.gov",
            fp: "C1BFF3BED5E3ADA485575632D894498694987FB3FC36C6DD8374FC4B87F1CE63",
            type: "Ed25519", secret: false, tint: 4,
            auth: "verified"
        },
        {
            name: "Radia Perlman", email: "radia@spanning.tree",
            fp: "C380A4E2DC37BB5DF0EF1A1EF5248B76FDF121A29433EEECEAA56C03EF9A7884",
            type: "RSA", secret: false, tint: 5,
            auth: "partly verified"
        },
        {
            name: "Linus Torvalds", email: "linus@kernel.org",
            fp: "46F7D4AB3E05E2C702CC36EAFB6E80F98F8B38B02666687B9094D883138391A1",
            type: "Ed25519", secret: false, tint: 2,
            auth: "unverified"
        }
    ];

    /* One run of the seeder made all seven, and KeyGenRequest::new pre-fills
       two years. The app prints both dates as %Y-%m-%d. */
    var CREATED = "2026-08-11";
    var EXPIRES = "2028-08-10";

    /* The app groups the fingerprint in fours, so a person can read it aloud
       or check it against a card. */
    function pretty(fp) {
        return fp.replace(/(.{4})/g, "$1 ").trim();
    }

    function initials(name) {
        return name.split(" ").slice(0, 2).map(function (p) { return p[0]; }).join("");
    }

    function fieldRow(label, value) {
        return '<div class="field-row"><dt>' + label + "</dt>" +
            '<dd class="mono">' + value + "</dd></div>";
    }

    function icon(id, cls) {
        return '<svg class="ico' + (cls ? " " + cls : "") + '" aria-hidden="true">' +
            '<use href="#' + id + '"/></svg>';
    }

    /* The app's TRUST section is one sentence chosen by authentication
       state, not per-certificate prose. */
    function trustLine(auth) {
        if (auth === "verified") {
            return "The web of trust confirms this identity.";
        }
        if (auth === "partly verified") {
            return "Some evidence for this identity, but not enough to rely on.";
        }
        return "Nothing vouches for this identity yet.";
    }

    function authPill(cert) {
        if (cert.auth === "unverified") { return ""; }
        var tone = cert.auth === "verified" ? "pill-ok" : "pill-warn";
        return '<span class="pill ' + tone + '">' + icon("i-certify") + cert.auth + "</span>";
    }

    function secretPill(cert) {
        return cert.secret
            ? '<span class="pill pill-accent">' + icon("i-key") + "secret key</span>"
            : "";
    }

    var list = document.getElementById("certList");
    var details = document.getElementById("details");
    if (!list || !details) { return; }

    var selected = 0;

    function renderList() {
        list.innerHTML = CERTS.map(function (cert, i) {
            return '' +
                '<li class="cert-row" role="option" data-index="' + i + '"' +
                ' aria-selected="' + (i === selected) + '" tabindex="' + (i === selected ? 0 : -1) + '">' +
                    '<span class="monogram" aria-hidden="true" style="--tint: var(--mono-' + cert.tint + ')">' +
                        initials(cert.name) +
                    "</span>" +
                    '<span class="cert-id">' +
                        '<span class="cert-name">' + cert.name + "</span>" +
                        '<span class="cert-mail">' + cert.email + "</span>" +
                    "</span>" +
                    '<span class="cert-meta">' +
                        '<span class="pills">' + authPill(cert) + secretPill(cert) +
                            '<span class="pill pill-ok">valid</span>' +
                        "</span>" +
                        '<span class="cert-caps">CSE · until 2028-08-10</span>' +
                    "</span>" +
                    /* An absent pill is meaningful to a sighted reader and
                       silent to everyone else, so the one case with no pill
                       says so. The others would only be read twice. */
                    (cert.auth === "unverified"
                        ? '<span class="visually-hidden">not authenticated</span>'
                        : "") +
                "</li>";
        }).join("");
    }

    function renderDetails() {
        var cert = CERTS[selected];
        var root = cert.secret;
        details.innerHTML = '' +
            '<div class="details-head">' +
                '<span class="monogram monogram-lg" aria-hidden="true" style="--tint: var(--mono-' + cert.tint + ')">' +
                    initials(cert.name) +
                "</span>" +
                '<span class="details-id">' +
                    '<span class="details-name">' + cert.name + "</span>" +
                    '<span class="details-mail">' + cert.email + "</span>" +
                "</span>" +
            "</div>" +
            '<div class="pills">' +
                '<span class="pill pill-ok">valid</span>' + secretPill(cert) +
            "</div>" +
            '<div class="divider"></div>' +
            '<p class="section-label">CERTIFICATE</p>' +
            "<dl>" +
                fieldRow("Fingerprint", pretty(cert.fp)) +
                fieldRow("Key ID", cert.fp.slice(0, 16)) +
                fieldRow("Algorithm", cert.type) +
                fieldRow("Created", CREATED) +
                fieldRow("Expires", EXPIRES) +
                fieldRow("Usage", "CSE") +
                fieldRow("User IDs", cert.name + " &lt;" + cert.email + "&gt;") +
            "</dl>" +
            '<div class="divider"></div>' +
            '<p class="section-label">TRUST</p>' +
            '<p class="trust-line">' + trustLine(cert.auth) + "</p>" +
            '<span class="check' + (root ? " is-checked is-disabled" : "") + '">' +
                '<span class="box">' + icon("i-check") + "</span>Trust root</span>" +
            '<p class="trust-note">' +
                (root
                    ? "Your own keys are always trust roots."
                    : "Certifications made by this key count as evidence.") +
            "</p>";
    }

    function select(index, focus) {
        selected = index;
        renderList();
        renderDetails();
        if (focus) {
            var row = list.querySelector('[data-index="' + index + '"]');
            if (row) { row.focus(); }
        }
    }

    list.addEventListener("click", function (event) {
        var row = event.target.closest(".cert-row");
        if (row) { select(Number(row.dataset.index), true); }
    });

    /* Arrow keys move through the list, the way they do in the app. */
    list.addEventListener("keydown", function (event) {
        var next = null;
        if (event.key === "ArrowDown") { next = (selected + 1) % CERTS.length; }
        if (event.key === "ArrowUp") { next = (selected - 1 + CERTS.length) % CERTS.length; }
        if (event.key === "Home") { next = 0; }
        if (event.key === "End") { next = CERTS.length - 1; }
        if (next !== null) {
            event.preventDefault();
            select(next, true);
        }
    });

    renderList();
    renderDetails();
}());
