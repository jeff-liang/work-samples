library("jsonlite")
library("janitor")
library("dplyr")
library(ggplot2)
options(digits=18)

data <- fromJSON(txt="C:/Users/Jeffrey/Desktop/ECO1400/Paper/data.json")
data <- as.data.frame(data)
data <- row_to_names(dat=data,row_number=1)
data <- clean_names(data)
data$claim_block_number <- strtoi(data$claim_block_number)
data$airdrop_amount <- as.double(data$airdrop_amount)
data$claim_tx_index <- strtoi(data$claim_tx_index)
data$claimer_recipient <- data$claimer_recipient == "TRUE"
data$recipient_eoa <- data$recipient_eoa == "TRUE"
data$ether_balance <- as.double(data$ether_balance)
data$other_uni_received <- data$other_uni_received == "TRUE"
data$both_transfer_and_received_in_a_single_block <- data$both_transfer_and_received_in_a_single_block == "TRUE"
data$transferred_to_eoa <- data$transferred_to_eoa == "TRUE"
data$completely_sold_in_one_transaction <- data$completely_sold_in_one_transaction == "TRUE"
data$completely_sold <- data$completely_sold == "TRUE"
data$total_uni_sold <- as.double(data$total_uni_sold)
data$number_of_sales <- as.numeric(data$number_of_sales)
data$number_of_transfers_away <- as.numeric(data$number_of_transfers_away)
data$number_of_transfers_received <- as.numeric(data$number_of_transfers_received)
data$index_of_transfers_away <- as.numeric(data$index_of_transfers_away)
data$index_of_transfers_received <- as.numeric(data$index_of_transfers_received)
data$block_number_of_last_sale <- as.numeric(data$block_number_of_last_sale)
data$claim_timestamp <- as.numeric(data$claim_timestamp)
data$claim_nonce <- as.numeric(data$claim_nonce)
data$claim_gas_price <- as.numeric(data$claim_gas_price)
data$claim_error <- as.numeric(data$claim_error)
data$number_of_claim_errors <- as.numeric(data$number_of_claim_errors)
data$amount_transferred_to_eo_as <- as.double(data$amount_transferred_to_eo_as)
data$amount_swapped <- as.double(data$amount_swapped)
data$date <- as.POSIXct(data$claim_timestamp,origin="1970-01-01",tz="UCT")
data$delta <- data$block_number_of_last_sale - data$claim_block_number
data$percent_sold <- data$total_uni_sold / data$airdrop_amount
data$percent_swapped <- data$amount_swapped / data$airdrop_amount

summary(data$recipient_eoa)
summary(data$both_transfer_and_received_in_a_single_block)

data$percent_eoa <- data$amount_transferred_to_eo_as / data$airdrop_amount

filtered <- filter(data,recipient_eoa & 
                     !both_transfer_and_received_in_a_single_block)

summary(filtered$other_uni_received)
summary(subset(filtered,other_uni_received,select=ether_balance))
summary(subset(filtered,!other_uni_received,select=ether_balance))

filtered <- filter(filtered,!other_uni_received)
same_claim <- filter(filtered, claimer_recipient)

summary(filtered$transferred_to_eoa)

summary(subset(filtered,transferred_to_eoa,select=percent_eoa))
summary(filtered$percent_eoa > 0 & filtered$percent_eoa < 1)

summary(filtered$claim_block_number)

sold <- filter(filtered, block_number_of_last_sale > 0)
summary(sold$completely_sold_in_one_transaction)
summary(sold$delta)
summary(sold$block_number_of_last_sale)

swapped <- filter(filtered, amount_swapped > 0)
summary(swapped$completely_sold_in_one_transaction)
summary(swapped$delta)
summary(swapped$block_number_of_last_sale)

summary(subset(filtered,log(ether_balance) < -10))

pdf('eth_percent.pdf')
ggplot(filtered,aes(x=log(ether_balance),y=percent_sold)) + geom_point(size=1,alpha=1/5) +
  labs(x = "Log of Ether Balance Before Airdrop",
       y = "Percent of Airdrop Transferred Away",
       title = "Percent of Airdrop Moved Against Log of Ether Balance")
dev.off()

pdf('eth_percent_swapped.pdf')
ggplot(filtered,aes(x=log(ether_balance),y=percent_swapped)) + geom_point(size=1,alpha=1/5) +
  labs(x = "Log of Ether Balance Before Airdrop",
       y = "Percent of Airdrop Sent to Decentralized Exchange",
       title = "Percent of Airdrop Moved to DEX Against Log of Ether Balance")
dev.off()

pdf('eth_time.pdf')
ggplot(filtered,aes(x=date,y=log(ether_balance))) + geom_point(size=1,alpha=1/10) +
labs(x = "Date of Airdrop Claim") +
labs(y = "Log of Ether Balance Before Airdrop") +
labs(title = "Log of Ether Balance Against Time of Airdrop Claim")
dev.off()

pdf('eth_error.pdf')
ggplot(same_claim,aes(x=number_of_claim_errors,y=log(ether_balance))) + geom_point(size=1,alpha=1/5) +
  labs(x = "Number of Failed Claim Attempts",
       y = "Log of Ether Balance Before Airdrop",
       title = "Log of Ether Balance Against Number of Failed Claim Attempts")
dev.off()

