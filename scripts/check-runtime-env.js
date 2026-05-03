#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const envPath = path.join(repoRoot, '.env');
const templatePath = path.join(repoRoot, '.env.example');
const envVar = 'ARK_API_KEY';

const processValue = normalizeSecret(process.env[envVar]);
if (processValue && !isPlaceholderValue(processValue)) {
  console.log(`${envVar} is available in process.env. Runtime preflight passed.`);
  process.exit(0);
}

if (!fs.existsSync(envPath)) {
  fail(
    `Missing ${envPath}. Copy ${templatePath} to ${envPath}, set ${envVar}, and .env must not be committed to GitHub. Without a valid API key the provider flow cannot run.`
  );
}

const parsed = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
const envFileValue = normalizeSecret(parsed[envVar]);
if (!envFileValue) {
  fail(
    `Found ${envPath}, but ${envVar} is missing. Set ${envVar} before running. Without a valid API key the provider flow cannot run.`
  );
}

if (isPlaceholderValue(envFileValue)) {
  fail(
    `Found ${envPath}, but ${envVar} still uses a placeholder value. Replace it with a real key before running. .env must not be committed to GitHub.`
  );
}

console.log(`${envVar} is available in ${envPath}. Runtime preflight passed.`);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseDotEnv(content) {
  return content.split(/\r?\n/).reduce((parsed, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return parsed;
    }

    const normalizedLine = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed;
    const separatorIndex = normalizedLine.indexOf('=');
    if (separatorIndex < 0) {
      return parsed;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    if (!key) {
      return parsed;
    }

    let value = normalizedLine.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
    return parsed;
  }, {});
}

function normalizeSecret(value) {
  if (!value) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isPlaceholderValue(value) {
  return [
    /^your[_-]?ark[_-]?api[_-]?key(?:[_-]?here)?$/i,
    /^your[_-]?api[_-]?key(?:[_-]?here)?$/i,
    /^replace(?:[_-]?me)?$/i,
    /^changeme$/i,
    /^paste[_-]?api[_-]?key[_-]?here$/i,
    /^example$/i,
    /^todo$/i,
    /^xxx+$/i,
    /^<[^>]+>$/,
    /^\$\{[^}]+\}$/,
  ].some((pattern) => pattern.test(value));
}