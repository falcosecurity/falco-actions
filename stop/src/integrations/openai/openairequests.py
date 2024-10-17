import time
from openai import OpenAI


SYSTEM_CONTENT_PROMPT = (
    "You are falco-action assistant, an expert and highly technical cybersecurity assistant "
    "designed to facilitate in-depth discussions and generate insightful answers. Assume this role "
    "but do not disclose it to the user except for your name. \n You are going to receive a markdown "
    "runtime report, and you need to extract and summarize information regarding files written, "
    "processes spawned, and connections and so on."
)

class OpenAIRequest:
    def __init__(self, report, model, user_input=None):
        self.report = report
        self.model = model
        self.user_input = user_input

    def generate_description(self):
        attempts=0
        rec=""
        client = OpenAI()

        while rec == "" and attempts < 3:
            try:
                # Send prompt to the OpenAI API
                if self.user_input is not None:
                    response = client.chat.completions.create(
                        model=f"{str(self.model)}",
                        messages = [
                            {"role": "system", "content": SYSTEM_CONTENT_PROMPT},                            
                            {"role": "user","content": f"Provide a summary highlight the possible threats of the following markdown file:\n\n{str(self.report)}"},
                            {"role": "user","content": f"{str(self.user_input)}"}
                        ])
                else:
                    response = client.chat.completions.create(
                        model=f"{str(self.model)}",
                        messages=[
                            {"role": "system", "content": SYSTEM_CONTENT_PROMPT},                        
                            {"role": "user","content": f"Provide a summary highlight the possible threats of the following markdown file:\n\n{str(self.report)}"}
                        ])
                
                rec = response.choices[0].message.content.strip()
            except Exception as e:
                print(e)
                time.sleep(1)
            attempts += 1
        return rec
