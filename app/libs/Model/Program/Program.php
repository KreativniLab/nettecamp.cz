<?php

declare(strict_types=1);

namespace App\Model;

use Nextras\Orm\Entity\Entity;

/**
 * @property int $id {primary}
 * @property string $author
 * @property string $title
 * @property string $description
 */
class Program extends Entity
{

	public function __construct(
		string $author,
		string $title
	) {
		parent::__construct();

		$this->author = $author;
		$this->title = $title;
	}

}
