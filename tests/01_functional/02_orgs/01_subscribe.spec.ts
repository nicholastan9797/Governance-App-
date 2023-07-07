import { Locator, expect, test } from "@playwright/test";
import { test as test_metamask } from "../../../fixtures";
import * as metamask from "@synthetixio/synpress/commands/metamask";
import { prisma } from "@senate/database";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test_metamask("expect to have all daos unsubscribed", async ({ page }) => {
  await page.getByText("Connect Wallet").click();
  await page.getByText("MetaMask").click();
  await metamask.acceptAccess();

  await page.waitForTimeout(500);
  await page.getByText("Send message").click();
  await page.waitForTimeout(500);
  await metamask.confirmSignatureRequest();
  await page.waitForTimeout(500);

  const numberOfDaos = await prisma.dao.count({});

  await expect(
    await page.getByTestId("unsubscribed-list").getByRole("listitem")
  ).toHaveCount(numberOfDaos);
});

test_metamask("unsigned subscribe to Aave", async ({ page }) => {
  await page
    .getByTestId("unsubscribed-list")
    .getByTestId("Aave")
    .getByTestId("subscribe-button")
    .click();

  await page.getByText("MetaMask").click();
  await metamask.acceptAccess();

  await page.waitForTimeout(500);
  await page.getByText("Send message").click();
  await page.waitForTimeout(500);
  await metamask.confirmSignatureRequest();
  await page.waitForTimeout(500);

  await expect(
    page.getByTestId("subscribed-list").getByTestId("Aave")
  ).toBeVisible();
});

test_metamask("signed subscribe to Uniswap", async ({ page }) => {
  await page.getByText("Connect Wallet").click();
  await page.getByText("MetaMask").click();
  await metamask.acceptAccess();

  await page.waitForTimeout(500);
  await page.getByText("Send message").click();
  await page.waitForTimeout(500);
  await metamask.confirmSignatureRequest();
  await page.waitForTimeout(500);

  await page
    .getByTestId("unsubscribed-list")
    .getByTestId("Uniswap")
    .getByTestId("subscribe-button")
    .click();

  await expect(
    page.getByTestId("subscribed-list").getByTestId("Uniswap")
  ).toBeVisible();
});

test_metamask("expect to be subscribed to 2 daos", async ({ page }) => {
  await page.getByText("Connect Wallet").click();
  await page.getByText("MetaMask").click();
  await metamask.acceptAccess();

  await page.waitForTimeout(500);
  await page.getByText("Send message").click();
  await page.waitForTimeout(500);
  await metamask.confirmSignatureRequest();
  await page.waitForTimeout(500);

  await expect(
    await page.getByTestId("subscribed-list").getByRole("listitem")
  ).toHaveCount(2);
});

test_metamask("subscribe to all daos", async ({ page }) => {
  test_metamask.setTimeout(30 * 60 * 1000);

  await page.getByText("Connect Wallet").click();
  await page.getByText("MetaMask").click();
  await metamask.acceptAccess();

  await page.waitForTimeout(500);
  await page.getByText("Send message").click();
  await page.waitForTimeout(500);
  await metamask.confirmSignatureRequest();

  await page.waitForTimeout(500);

  await expect(
    await page.getByTestId("subscribed-list").getByRole("listitem")
  ).toHaveCount(2);

  const numberOfDaos = await prisma.dao.count({});
  const daosToSubscribe = await page.getByTestId("subscribe-button").all();

  for (const org of daosToSubscribe) {
    await org.click();
    await page.waitForTimeout(10000);
  }

  await expect(
    await page.getByTestId("subscribed-list").getByRole("listitem")
  ).toHaveCount(numberOfDaos);
});

test_metamask("expect to be subscribed to all daos", async ({ page }) => {
  await page.getByText("Connect Wallet").click();
  await page.getByText("MetaMask").click();
  await metamask.acceptAccess();

  await page.waitForTimeout(500);
  await page.getByText("Send message").click();
  await page.waitForTimeout(500);
  await metamask.confirmSignatureRequest();
  await page.waitForTimeout(500);

  const numberOfDaos = await prisma.dao.count({});
  await expect(
    await page.getByTestId("subscribed-list").getByRole("listitem")
  ).toHaveCount(numberOfDaos);
});
