import { readFileSync } from "node:fs";
import { Client } from "discord.js-selfbot-v13";
import { UserFlags } from "discord-api-types/v9";
import config from "./config.json";
const message = readFileSync("./message.txt", { encoding: "utf-8" });
const users = {
    priority: [],
    regular: []
};
const masterClient = new Client();
const shouldSkip = (member) => {
    const { user } = member;
    if (user.bot)
        return true;
    for (const flag of [
        UserFlags.Staff,
        UserFlags.Quarantined,
        UserFlags.Spammer
    ]) {
        if (member?.user?.flags?.has?.(flag))
            return true;
    }
    return false;
};
const isPriority = (member) => {
    // How do we get Nitro information? If nitro, return true somehow?
    for (const flag of [
        UserFlags.Partner,
        UserFlags.VerifiedDeveloper,
        UserFlags.PremiumEarlySupporter,
        UserFlags.CertifiedModerator,
        UserFlags.BugHunterLevel1,
        UserFlags.BugHunterLevel2
    ]) {
        if (member?.user?.flags?.has?.(flag))
            return true;
    }
    return false;
};
const processMember = (member) => {
    if (shouldSkip(member))
        return;
    users[isPriority(member) ? "priority" : "regular"].push(member.id);
};
const getAndDm = async (client) => {
    for (const key of ["priority", "regular"]) {
        const section = users[key];
        while (section.length > 0) {
            const resolvedUser = await client.users.fetch(section.shift());
            try {
                await resolvedUser.send(message);
                return;
            }
            catch (err) {
                console.error(err);
            }
        }
    }
};
masterClient.on("messageCreate", (message) => {
    if (message.channelId === config.channel && message?.author?.id === config.nadeko) {
        // Welcome message in the target channel, process the mentions
        [...(message?.mentions?.members?.values?.() || [])].forEach(processMember);
    }
});
masterClient.once("ready", () => console.log("master is ready"));
Promise.all(config.puppets.map((t) => {
    const c = new Client();
    c.once("ready", () => {
        console.log(c?.user?.tag + " is ready");
        setInterval(() => getAndDm(c), config.delaySecs * 1000);
    });
    return c.login(t);
})).then(() => {
    masterClient.login(config.main);
});
