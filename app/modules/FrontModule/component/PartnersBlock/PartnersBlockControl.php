<?php declare(strict_types = 1);

namespace App\FrontModule\Components;

use Nette\Application\UI\Control;
use Nette\Utils\ArrayHash;

class PartnersBlockControl extends Control
{

    /** @var mixed[] */
    private $partners = [];

    /** @var bool */
    private $isEmpty = false;

    /**
     * @param mixed[] $partners
     */
    public function __construct(array $partners = [])
    {
        $this->partners = $partners;
        foreach ($this->partners as $partner) {
            if (isset($partner['empty'])) {
                $this->isEmpty = true;
            }
        }
    }


    public function render(): void
    {
        $this->template->empty = $this->isEmpty;
        $this->template->partners = ArrayHash::from($this->partners);
        $this->template->render(__DIR__ . '/partnersBlock.latte');
    }

}
