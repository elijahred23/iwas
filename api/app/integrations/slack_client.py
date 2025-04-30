
import requests
import logging

class SlackClientException(Exception):
    pass

class SlackClient:
    def __init__(self, token: str):
        self.base_url = "https://slack.com/api"
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def _handle_response(self, response):
        data = response.json()
        if not response.ok or not data.get("ok", False):
            logging.error(f"Slack API error: {response.status_code} - {data}")
            raise SlackClientException(data.get("error", "Unknown Slack API error"))
        return data

    def post_message(self, channel: str, text: str, blocks: list = None):
        url = f"{self.base_url}/chat.postMessage"
        payload = {
            "channel": channel,
            "text": text
        }
        if blocks:
            payload["blocks"] = blocks
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def get_channel_list(self):
        url = f"{self.base_url}/conversations.list"
        response = requests.get(url, headers=self.headers)
        return self._handle_response(response)

    def get_user_info(self, user_id: str):
        url = f"{self.base_url}/users.info"
        params = {"user": user_id}
        response = requests.get(url, headers=self.headers, params=params)
        return self._handle_response(response)

    def create_channel(self, name: str, is_private: bool = False):
        url = f"{self.base_url}/conversations.create"
        payload = {
            "name": name,
            "is_private": is_private
        }
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def invite_users_to_channel(self, channel: str, users: list):
        url = f"{self.base_url}/conversations.invite"
        payload = {
            "channel": channel,
            "users": ",".join(users)
        }
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def archive_channel(self, channel: str):
        url = f"{self.base_url}/conversations.archive"
        payload = {"channel": channel}
        response = requests.post(url, headers=self.headers, json=payload)
        return self._handle_response(response)

    def upload_file(self, channels: list, file_path: str, title: str = None):
        url = f"{self.base_url}/files.upload"
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        with open(file_path, "rb") as f:
            files = {
                "file": f
            }
            data = {
                "channels": ",".join(channels),
                "title": title or file_path
            }
            response = requests.post(url, headers=headers, files=files, data=data)
            return self._handle_response(response)
