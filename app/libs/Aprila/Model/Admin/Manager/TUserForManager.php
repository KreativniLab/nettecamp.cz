<?php
/**
 * @author Honza Cerny (http://honzacerny.com)
 */

namespace Aprila\Model\Admin\Manager;

use Nette\InvalidStateException;
use Nette\Security\User;

trait TUserForManager
{
	/** @var User */
	public $user;


	/**
	 * @param User $user
	 */
	public function setUser(User $user)
	{
		$this->user = $user;
	}

	public function getUser()
	{
		if ($this->user) {
			return $this->user;
		} else {
			throw new InvalidStateException('User not set');
		}
	}

	public function isUser()
	{
		if ($this->user) {
			return TRUE;
		} else {
			return FALSE;
		}
	}

	public function remove($id = 0)
	{
		return $this->repository->delete($id, $this->getUser()->getId());
	}

}