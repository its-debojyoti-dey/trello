/* eslint-disable */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('Starting Playwright browser to record demo video...');
  
  // Make sure demo-video directory exists
  const videoDir = path.join(__dirname, 'public', 'demo-video');
  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  // Try launching Google Chrome or MS Edge installed on the system to avoid long downloads
  let browser;
  try {
    console.log('Attempting to launch system Google Chrome...');
    browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      slowMo: 800
    });
  } catch (e) {
    try {
      console.log('Google Chrome not found. Attempting to launch system Microsoft Edge...');
      browser = await chromium.launch({
        headless: false,
        channel: 'msedge',
        slowMo: 800
      });
    } catch (err2) {
      console.log('System browser not found. Launching standard Playwright browser...');
      browser = await chromium.launch({
        headless: false,
        slowMo: 800
      });
    }
  }

  let context;
  let page;

  try {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: videoDir,
        size: { width: 1280, height: 720 }
      }
    });
    page = await context.newPage();
  } catch (error) {
    if (error.message.includes('ffmpeg') || error.message.includes('Executable doesn\'t exist')) {
      console.log('\n[INFO] Playwright ffmpeg dependency is not installed.');
      console.log('Running walkthrough LIVE on your screen without recording video.');
      console.log('To enable video recording, please run: npx playwright install ffmpeg\n');
      
      if (context) await context.close();
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 }
      });
      page = await context.newPage();
    } else {
      throw error;
    }
  }

  try {
    // 1. Go to homepage
    console.log('Navigating to homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // 2. Open "Manage Users" modal and create a new user
    console.log('Opening "Manage Users" Modal...');
    await page.click('button:has-text("Manage Users")');
    await page.waitForTimeout(1000);

    const testEmail = `demo.user.${Date.now()}@example.com`;
    console.log(`Adding new user: Demo User (${testEmail})...`);
    await page.fill('[placeholder="e.g. John Doe"]', 'Demo User');
    await page.fill('[placeholder="e.g. john@example.com"]', testEmail);
    await page.click('button:has-text("Add User")');
    await page.waitForTimeout(1500);

    // Close user modal
    console.log('Closing User Modal...');
    await page.locator('button[aria-label="Close modal"]').click();
    await page.waitForTimeout(1000);

    // 3. Create a new Board
    console.log('Creating a new Board...');
    await page.fill('[placeholder="e.g. Q3 Launch Campaign"]', 'Ascendo AI Product Launch');
    await page.selectOption('select', 'PUBLIC');
    await page.click('button:has-text("Create Board")');
    await page.waitForTimeout(2000);

    // 4. Click on the newly created Board card
    console.log('Navigating to the new board page...');
    await page.click('h3:has-text("Ascendo AI Product Launch")');
    await page.waitForTimeout(2500);

    // 5. Change board name and privacy using inline edit controls
    console.log('Modifying Board details...');
    // Rename board inline by clicking name, entering edit mode, typing and hitting Enter
    await page.click('h1:has-text("Ascendo AI Product Launch")');
    await page.waitForTimeout(500);
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Ascendo AI Product Roadmap');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Modify privacy to PRIVATE
    console.log('Modifying Board privacy...');
    await page.selectOption('select:has(option[value="PRIVATE"])', 'PRIVATE');
    await page.waitForTimeout(1500);

    // 6. Add the user we created to this Board using the select dropdown
    console.log('Adding Demo User to the board...');
    await page.selectOption('select:has(option:has-text("+ Add Member"))', { label: 'Demo User' });
    await page.waitForTimeout(2000);

    // 7. Create lists
    console.log('Creating lists...');
    // Create List 1: To Do
    await page.click('button:has-text("Add List")');
    await page.fill('[placeholder="Enter list title..."]', 'To Do');
    await page.click('button:has-text("Add List")');
    await page.waitForTimeout(1500);

    // Create List 2: In Progress
    await page.click('button:has-text("Add List")');
    await page.fill('[placeholder="Enter list title..."]', 'In Progress');
    await page.click('button:has-text("Add List")');
    await page.waitForTimeout(1500);

    // Create List 3: Done
    await page.click('button:has-text("Add List")');
    await page.fill('[placeholder="Enter list title..."]', 'Done');
    await page.click('button:has-text("Add List")');
    await page.waitForTimeout(1500);

    // 8. Create a Card in the "To Do" list
    console.log('Creating cards...');
    const toDoList = page.locator('div:has(> h3:has-text("To Do"))').locator('..');
    await toDoList.locator('button:has-text("Add Card")').click();
    await toDoList.locator('[placeholder="Enter card title..."]').fill('Design Database Schema');
    await toDoList.locator('button:has-text("Add Card")').click();
    await page.waitForTimeout(1500);

    // 9. Open the Card modal, update description, assign the user
    console.log('Opening Card modal...');
    await page.click('div:has-text("Design Database Schema")');
    await page.waitForTimeout(1500);

    console.log('Updating description and assigning member...');
    await page.fill('textarea', 'Design and implement the MongoDB schema for boards, lists, cards, and users using Prisma.');
    await page.selectOption('select:has(option:has-text("Demo User"))', { label: 'Demo User' });
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);

    // 10. Drag and drop the card from "To Do" list to "In Progress" list
    console.log('Moving card using drag-and-drop...');
    const card = page.locator('div:has-text("Design Database Schema")').first();
    const inProgressList = page.locator('div:has(> h3:has-text("In Progress"))').locator('..');

    const cardBoundingBox = await card.boundingBox();
    const listBoundingBox = await inProgressList.boundingBox();

    if (cardBoundingBox && listBoundingBox) {
      await page.mouse.move(
        cardBoundingBox.x + cardBoundingBox.width / 2,
        cardBoundingBox.y + cardBoundingBox.height / 2
      );
      await page.mouse.down();
      await page.mouse.move(
        listBoundingBox.x + listBoundingBox.width / 2,
        listBoundingBox.y + listBoundingBox.height / 2 + 50,
        { steps: 20 } // Smooth move visual
      );
      await page.mouse.up();
    }
    await page.waitForTimeout(2000);

    // 11. Go back to Home Dashboard
    console.log('Returning to Dashboard...');
    await page.click('a:has-text("Ascendo AI")');
    await page.waitForTimeout(2000);

    // 12. Delete the Board to demonstrate Cascade Delete
    console.log('Deleting the board to demonstrate cascade deletion...');
    page.once('dialog', async (dialog) => {
      console.log(`Confirming delete dialog: "${dialog.message()}"`);
      await dialog.accept();
    });
    
    // Find delete button on our board card
    const boardCard = page.locator('div:has(h3:has-text("Ascendo AI Product Roadmap"))').first();
    await boardCard.locator('button[title="Delete Board"]').click();
    await page.waitForTimeout(3000);

    console.log('Board deleted and cascade deletes completed successfully.');

  } catch (error) {
    console.error('An error occurred during script execution:', error);
  } finally {
    // Close the browser context to finish saving video
    await context.close();
    await browser.close();
    
    console.log('\nDemo video generation completed.');
    console.log(`Video saved under: ${videoDir}`);
  }
})();
