package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	fmt.Println("AegisNet Daemon starting...")
	fmt.Println("This daemon will handle mesh transport, offline queuing, and Double Ratchet E2EE.")

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok", "service": "aegisnet-daemon"}`))
	})

	port := "127.0.0.1:8081"
	fmt.Printf("Daemon listening on %s\n", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Daemon server failed: %v", err)
	}
}
