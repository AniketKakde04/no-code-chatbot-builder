import sys
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# configuration
VECTOR_STORAGE_PATH = "./chroma_db"
embeddings = HuggingFaceEmbeddings(model_name="all-miniLM-L6-v2")

def check_bot(bot_id, query):
    print(f"--- Debugging Bot: {bot_id} ---")
    try:
        vectorstore = Chroma(
            persist_directory=VECTOR_STORAGE_PATH,
            collection_name=bot_id,
            embedding_function=embeddings
        )
        
        # Check count (using len of get which is more reliable for chromadb)
        # Note: Depending on langchain version, accessing underlying collection might vary
        # We will try a simple get
        existing_docs = vectorstore.get()
        count = len(existing_docs['ids'])
        print(f"Total Chunks in DB: {count}")
        
        if count == 0:
            print("Bot has no data!")
            return

        # Check search results
        print(f"\nSearching for: '{query}'")
        docs = vectorstore.similarity_search(query, k=3)
        
        for i, doc in enumerate(docs):
            print(f"\n[Result {i+1}]")
            print(f"Source: {doc.metadata.get('source', 'Unknown')}")
            print(f"Content Preview: {doc.page_content[:400]}...") # Show first 400 chars
            print("-" * 40)
            
    except Exception as e:
        print(f"Error accessing DB: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python debug_bot.py <bot_id> <query>")
    else:
        check_bot(sys.argv[1], sys.argv[2])
