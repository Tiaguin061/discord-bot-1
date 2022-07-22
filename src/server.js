require("dotenv").config();
const { default: axios } = require('axios');

const {
  discordTexts, replaceToMemberUserTag
} = require('../discord-variables-texts');
const express = require("express");

const { 
  MessageButton, 
  MessageActionRow, 
  Modal, 
  TextInputComponent,
  Client,
  Intents,
} = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MEMBERS, 
    Intents.FLAGS.GUILD_MESSAGES,
  ]
});

const channelId = process.env.DISCORD_CHANNEL_ID;

async function loadVerifyEmailButton(member, channelIdParam) {
  const channel = client.channels.cache.get(channelIdParam || channelId);

  const openModalBtn = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setCustomId('openModalBtn')
        .setLabel(replaceToMemberUserTag(discordTexts.channel.verifyEmailButton.label))
        .setStyle('SUCCESS'),
    );

  await channel.send({ 
    content: member ? replaceToMemberUserTag(discordTexts.channel.welcome.text, member) : discordTexts.channel.welcome.text,
    components: [openModalBtn] 
  });
}

async function handleButtonInteraction(interaction) {
  const user = interaction.member.user;

  const emailInputLabel = replaceToMemberUserTag(discordTexts.channel.modal.emailInputLabel, user);
  const modalTitle = replaceToMemberUserTag(discordTexts.channel.modal.title, user);

  const modal = new Modal()
  .setCustomId('validateEmailId')
  .setTitle(modalTitle);

  const emailInput = new TextInputComponent()
    .setCustomId('emailInput')
    .setLabel(emailInputLabel) 
    .setStyle('SHORT')
    .setMaxLength(100);

  const emailActionRow = new MessageActionRow().addComponents(emailInput);

  modal.addComponents(emailActionRow);

  await interaction.showModal(modal);
}

async function verifyIfEmailIsValid(interaction) {
  const userEmail = await interaction.fields.getTextInputValue('emailInput');

  const emailRegex = /\S+@\S+.\S+/;

  const user = interaction.member.user;

  if(!emailRegex.test(userEmail)) {
    interaction.reply({ 
      content: replaceToMemberUserTag(discordTexts.emailFormatedNotValidError, user), 
      ephemeral: true 
    });

    return false;
  }

  return userEmail;
}

async function sendToValidateEmailFromMakeWebhook({data, interaction, command}) {
  const member = interaction.member.user;

  const supportBtnMessage = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setLabel(replaceToMemberUserTag(discordTexts.webHook.error.buttons.talkToSuport.label, member))
        .setStyle('LINK')
        .setURL(replaceToMemberUserTag(discordTexts.webHook.error.buttons.talkToSuport.link, member))
  );

  try {
    const webhookResponse = await axios.post(process.env.MAKE_WEBHOOK_URL, {
      ...data,
      command,
    });
    
    const result = webhookResponse.data;
  
    if(result.status) {
      const status = result.status.toLowerCase();
  
      if(status === 'success') {
        await interaction.reply({ 
          content: replaceToMemberUserTag(discordTexts.webHook.success, member),
          ephemeral: true,
        });
      }
  
      if(status === 'id-exist') {
        await interaction.reply({ 
          content: replaceToMemberUserTag(discordTexts.webHook.emailExist, member),
          ephemeral: true,
          components: [supportBtnMessage]
        });
      }
    
      if(status === 'error') {
        const buttons = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId('verifyEmailBtn')
              .setLabel(replaceToMemberUserTag(discordTexts.webHook.error.buttons.verifyEmailAgain.label, member))
              .setStyle('PRIMARY'),
            supportBtnMessage
          );
  
        await interaction.reply({ 
          content: replaceToMemberUserTag(discordTexts.webHook.error.text, member),
          ephemeral: true,
          components: [buttons],
        });
      }

      return null;
    }
    
    await interaction.reply({ 
      content: replaceToMemberUserTag(discordTexts.webHook.notFoundStatus, member),
      ephemeral: true,
      components: [supportBtnMessage]
    });
      
    return null;
  } catch (error) {
    console.log({error})
    await interaction.reply({ 
      content: replaceToMemberUserTag(discordTexts.webHook.notFoundStatus, member),
      ephemeral: true,
      components: [supportBtnMessage]
    });
  }

  return null;
}

async function verifyLeaveInput(interaction) {
  const leaveValue = await interaction.fields.getTextInputValue('leaveInput');

  const member = interaction.member.user;

  if(!leaveValue) {
    await interaction.reply({ 
      content: replaceToMemberUserTag(discordTexts.server.leave.notFoundValue.text, member),
      ephemeral: true,
    });

    return false;
  }

  return leaveValue;
}

async function openLeaveModal(interaction) {
  const member = interaction.member.user;
  
  const leaveModalInputLabel = replaceToMemberUserTag(discordTexts.server.leave.modal.leaveInputLabel, member);
  const modalTitle = replaceToMemberUserTag(discordTexts.server.leave.modal.title, member);

  const modal = new Modal()
  .setCustomId('leaveModalId')
  .setTitle(modalTitle);

  const leaveInput = new TextInputComponent()
    .setCustomId('leaveInput')
    .setLabel(leaveModalInputLabel) 
    .setStyle('SHORT')
    .setMaxLength(100);

  const leaveActionRow = new MessageActionRow().addComponents(leaveInput);

  modal.addComponents(leaveActionRow);

  if(interaction.isButton() && interaction.customId === 'confirmDiscordServerExit') {
    return interaction.showModal(modal);
  }
}

async function discordServerLeaveMakeWebhook({data, interaction, command}) {
  const member = interaction.member.user;

  const rowMessage = new MessageActionRow()
    .addComponents(
      new MessageButton()
        .setLabel(replaceToMemberUserTag(discordTexts.webHook.error.buttons.talkToSuport.label, member))
        .setStyle('LINK')
        .setURL(replaceToMemberUserTag(discordTexts.webHook.error.buttons.talkToSuport.link, member))
  );

  try {
    const webhookResponse = await axios.post(process.env.MAKE_WEBHOOK_URL, {
      ...data,
      command,
    });
    
    const result = webhookResponse.data;

    if(result.status) {
      const status = result.status.toLowerCase();

      if(status === 'success') {
        await interaction.reply({ 
          content: replaceToMemberUserTag(discordTexts.server.leave.webhook.success.text, member),
          ephemeral: true,
        });
      }

      if(status === 'error') {
        await interaction.reply({ 
          content: replaceToMemberUserTag(discordTexts.server.leave.webhook.error.text, member),
          ephemeral: true,
        });
      }

      if(status === 'leave-transaction-error') {
        await interaction.reply({ 
          content: replaceToMemberUserTag(discordTexts.server.leave.webhook.transactionError.text, member),
          ephemeral: true,
        });
      }

      return {
        status: result.status
      };
    }

    await interaction.reply({ 
      content: replaceToMemberUserTag(discordTexts.webHook.notFoundStatus, member),
      ephemeral: true,
      components: [rowMessage]
    });
  } catch (error) {
    await interaction.reply({ 
      content: replaceToMemberUserTag(discordTexts.webHook.notFoundStatus, member),
      ephemeral: true,
      components: [rowMessage]
    });
  }
  
  return null;
}

client.on('messageCreate', async (message) => {
  const channelId = message.channel.id;

  if(message.content === '/load-verify-email-button') {
    loadVerifyEmailButton(null, channelId);

    if(message.deletable) {
      message.delete();
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if(!interaction) {
    return null;
  }

  const member = interaction.member;
  let username = '';
  let discriminator = '';
  let tag = '';

  if(member) {
    username = member.user.username;
    discriminator = member.user.discriminator;
    tag = `${username}#${discriminator}`;
  }

  if (interaction.customId === 'openModalBtn') {
    return handleButtonInteraction(interaction);
  };

  if(interaction.isModalSubmit() && interaction.customId === 'validateEmailId') {
    const emailInformed = await verifyIfEmailIsValid(interaction);

    if(emailInformed) {
      await sendToValidateEmailFromMakeWebhook({
        data: {
          email: emailInformed,
          member: {
            ...member,
            user: {
              ...member.user,
              tag,
            }
          },
          command: null,
          transactionId: null
        },
        interaction,
        command: null,
      });
    }

    return null;
  }

  if(interaction.isButton() && interaction.customId === 'confirmDiscordServerExit') {
    await openLeaveModal(interaction)

    return null;
  }

  if(interaction.isModalSubmit() && interaction.customId === 'leaveModalId') {
    const leaveValue = await verifyLeaveInput(interaction);

    if(leaveValue) {
      await discordServerLeaveMakeWebhook({
        data: {
          email: null,
          member: {
            ...member,
            user: {
              ...member.user,
              tag,
            }
          },
          command: null,
          transactionId: leaveValue
        },
        interaction,
        command: null,
      });
    }

    return null;
  }

  // commands
  if(interaction.isCommand()) {
    if(interaction.commandName === discordTexts.server.commands.sair.commandName) {
      const confirmDiscordServerExit = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId('confirmDiscordServerExit')
          .setLabel(replaceToMemberUserTag(discordTexts.server.leave.button.label))
          .setStyle('DANGER'),
      );
      
      await interaction.reply({
        content: `${interaction.member.user}, deseja mesmo sair do servidor? Clique no botão para sair.`,
        components: [confirmDiscordServerExit],
        ephemeral: true
      });
    }
  };
});

if (!(process.env.NODE_ENV === 'production')) {
  process.on('SIGTERM', () => {
    process.exit();
  }); 
}

const log = `[Log]: At [${new Date()}] Discord Bot server started.`
const app = express();
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`${log} on port: ${port}`)
  
  client.login(process.env.DISCORD_BOT_TOKEN);
});