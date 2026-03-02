package br.com.genesis.ranking.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.genesis.ranking.model.User;

public interface UserRepository extends JpaRepository<User, String> {
  Optional<User> findByUsernameIgnoreCase(String username);
  boolean existsByUsernameIgnoreCase(String username);
}
