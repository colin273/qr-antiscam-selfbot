import { readFileSync } from "node:fs";
import { Client, GuildMember, Message } from "discord.js-selfbot-v13";
import { UserFlags } from "discord-api-types/v9";
import config from "./config.json";

const message = readFileSync("./message.txt", { encoding: "utf-8" });

const users: {
  priority: string[],
  regular: string[]
} = {
  priority: [],
  regular: []
};

const masterClient = new Client();

const shouldSkip = (member: GuildMember): boolean => {
  const { user } = member;
  if (user.bot) return true;
  for (const flag of [
    UserFlags.Staff,
    UserFlags.Quarantined,
    UserFlags.Spammer
  ]) {
    if (member?.user?.flags?.has?.(flag)) return true;
  }
  return false;
};

const isPriority = (member: GuildMember): boolean => {
  if (member?.user?.premiumSince) return true;
  for (const flag of [
    UserFlags.Partner,
    UserFlags.VerifiedDeveloper,
    UserFlags.PremiumEarlySupporter,
    UserFlags.CertifiedModerator,
    UserFlags.BugHunterLevel1,
    UserFlags.BugHunterLevel2
  ]) {
    if (member?.user?.flags?.has?.(flag)) return true;
  }
  return false;
};

const processMember = (member: GuildMember): void => {
  if (shouldSkip(member)) return;
  users[isPriority(member) ? "priority" : "regular"].push(member.id);
};

const getAndDm = async (client: Client): Promise<void> => {
  for (const key of ["priority", "regular"]) {
    const section = users[key];
    while (section.length > 0) {
      const resolvedUser = await client.users.fetch(section.shift());
      try {
        await resolvedUser.send(message);
        return;
      } catch (err) {
        console.error(err);
      }
    }
  }
};

masterClient.on("messageCreate", (message: Message): void => {
  if (message.channelId === config.channel && message?.author?.id === config.nadeko) {
    // Welcome message in the target channel, process the mentions
    [...(message?.mentions?.members?.values?.() || [])].forEach(processMember);
  }
});

masterClient.once("ready", (): void => console.log("master is ready"));

Promise.all(config.puppets.map((t: string): Promise<string> => {
  const c = new Client();
  c.once("ready", (): void => {
    console.log(c?.user?.tag + " is ready");
    setInterval(() => getAndDm(c), config.delaySecs * 1000);
  });
  return c.login(t);
})).then((): void => {
  masterClient.login(config.main);
});