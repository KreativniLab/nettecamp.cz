ALTER TABLE `registration`
    ADD `company_id` varchar(100) COLLATE 'utf8mb4_czech_ci' NOT NULL AFTER `invoice`;
