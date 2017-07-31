ALTER TABLE `registration`
  ADD `status` enum('registration','waitinglist','storno','payed') COLLATE 'ascii_general_ci' NOT NULL DEFAULT 'registration' AFTER `year`;